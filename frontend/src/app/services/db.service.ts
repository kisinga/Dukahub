import { Injectable } from "@angular/core";
import PocketBase, { FileOptions } from "pocketbase";
import { BaseRecord, BatchOp, BatchOperationType, DbOperation, OperationParams } from "../../types/main";
import {
  Collections,
  TypedPocketBase
} from "../../types/pocketbase-types";

@Injectable({
  providedIn: "root",
})
export class DbService {
  private pb = new PocketBase(
    "http://127.0.0.1:8090",
  ) as TypedPocketBase;

  getAuthStore() {
    return this.pb.authStore;
  }

  async toggleDayOperationState(data: any) {
    return this.pb.send("/daily_financials", data);
  }

  login(email: string, password: string) {
    return this.pb.collection(Collections.Admins).authWithPassword(email, password, {
      expand: "company",
    });

  }

  logout(): void {
    this.pb.authStore.clear();
  }

  async execute<T extends BaseRecord>(
    collection: Collections,
    params: OperationParams<T>
  ): Promise<T | T[] | BatchService> {
    switch (params.operation) {
      case DbOperation.list_search:
        const records = await this.pb.collection(collection)
          .getFullList<T>(params.options);
        return records;

      case DbOperation.view:
        const singleRecord = await this.pb.collection(collection)
          .getOne<T>(params.id);
        return singleRecord;

      case DbOperation.create:
        // Handle FormData and regular objects differently
        const createData = params.createparams instanceof FormData
          ? params.createparams
          : params.createparams as T;
        const newRecord = await this.pb.collection(collection)
          .create<T>(createData);
        return newRecord;

      case DbOperation.update:
        const updatedRecord = await this.pb.collection(collection)
          .update<T>(params.updateParams.id, params.updateParams.data);
        return updatedRecord;

      case DbOperation.delete:
        await this.pb.collection(collection)
          .delete(params.id);
        return [];

      case DbOperation.batch_service: {
        return new BatchService(this.pb);
      }

      default:
        throw new Error('Invalid operation');
    }

  }

  // helper function exposing the built-in PocketBase function to generate URLs for files
  // since pb is private
  generateURL(
    record: {
      [key: string]: any;
    },
    filename: string,
    queryParams?: FileOptions,
  ): string {
    return this.pb.files.getURL(record, filename, queryParams);
  }

}

export class BatchService {
  private ops: BatchOp<any>[] = [];
  private pb: PocketBase

  constructor(pb: PocketBase) {
    this.pb = pb;
  }

  // Add an operation to the batch.
  add<T extends BaseRecord>(op: BatchOp<T>) {
    this.ops.push(op);
  }

  // Send all queued operations. Note: This method hides the underlying
  // PocketBase batch API and exposes only the result.
  async send(): Promise<any[]> {
    // Create a new batch instance (global across collections).
    const batch = this.pb.createBatch();

    // Queue each operation into the batch.
    for (const op of this.ops) {
      switch (op.type) {
        case BatchOperationType.create: {
          // For create operations, use the collection from the op.
          batch.collection(op.collection).create(op.data);
          break;
        }
        case BatchOperationType.update: {
          batch.collection(op.collection).update(op.id, op.data);
          break;
        }
        case BatchOperationType.delete: {
          batch.collection(op.collection).delete(op.id);
          break;
        }
        case BatchOperationType.upsert: {
          if (op.id) {
            batch.collection(op.collection).update(op.id, op.data);
          } else {
            batch.collection(op.collection).create(op.data);
          }
          break;
        }
        default:
          throw new Error("Unsupported batch operation type");
      }
    }

    // Send the batch of operations.
    // Note: The JS client uses `send()` instead of `commit()`.
    const responses = await batch.send();
    // Clear the queued operations.
    this.ops = [];
    return responses;
  }
}
