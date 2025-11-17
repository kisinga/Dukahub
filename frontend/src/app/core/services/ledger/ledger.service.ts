import { Injectable, inject, signal } from '@angular/core';
import { ApolloService } from '../apollo.service';
import { map, catchError, of, from } from 'rxjs';
import {
  GET_LEDGER_ACCOUNTS,
  GET_JOURNAL_ENTRIES,
  GET_JOURNAL_ENTRY,
} from '../../graphql/operations.graphql';

export interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
  balance: number;
}

export interface JournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  meta?: Record<string, any> | null;
}

export interface JournalEntry {
  id: string;
  entryDate: string;
  postedAt: string;
  sourceType: string;
  sourceId: string;
  memo?: string | null;
  lines: JournalLine[];
}

export interface JournalEntriesOptions {
  accountCode?: string;
  startDate?: string;
  endDate?: string;
  sourceType?: string;
  take?: number;
  skip?: number;
}

@Injectable({
  providedIn: 'root',
})
export class LedgerService {
  private readonly apolloService = inject(ApolloService);

  readonly accounts = signal<LedgerAccount[]>([]);
  readonly entries = signal<JournalEntry[]>([]);
  readonly totalEntries = signal(0);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  loadAccounts() {
    this.isLoading.set(true);
    this.error.set(null);

    const client = this.apolloService.getClient();
    const queryPromise = client.query<{ ledgerAccounts: { items: LedgerAccount[] } }>({
      query: GET_LEDGER_ACCOUNTS as any,
      fetchPolicy: 'network-only',
    });

    return from(queryPromise).pipe(
      map((result) => {
        if (result.data) {
          this.accounts.set(result.data.ledgerAccounts.items);
          this.isLoading.set(false);
          return result.data.ledgerAccounts.items;
        }
        this.isLoading.set(false);
        return [];
      }),
      catchError((err) => {
        this.error.set(err.message || 'Failed to load accounts');
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  loadJournalEntries(options?: JournalEntriesOptions) {
    this.isLoading.set(true);
    this.error.set(null);

    const client = this.apolloService.getClient();
    const queryPromise = client.query<{
      journalEntries: { items: JournalEntry[]; totalItems: number };
    }>({
      query: GET_JOURNAL_ENTRIES as any,
      variables: { options },
      fetchPolicy: 'network-only',
    });

    return from(queryPromise).pipe(
      map((result) => {
        if (result.data) {
          this.entries.set(result.data.journalEntries.items);
          this.totalEntries.set(result.data.journalEntries.totalItems);
          this.isLoading.set(false);
          return result.data.journalEntries;
        }
        this.isLoading.set(false);
        return { items: [], totalItems: 0 };
      }),
      catchError((err) => {
        this.error.set(err.message || 'Failed to load journal entries');
        this.isLoading.set(false);
        return of({ items: [], totalItems: 0 });
      })
    );
  }

  getJournalEntry(id: string) {
    const client = this.apolloService.getClient();
    const queryPromise = client.query<{ journalEntry: JournalEntry | null }>({
      query: GET_JOURNAL_ENTRY as any,
      variables: { id },
      fetchPolicy: 'network-only',
    });

    return from(queryPromise).pipe(
      map((result) => (result.data ? result.data.journalEntry : null)),
      catchError((err) => {
        this.error.set(err.message || 'Failed to load journal entry');
        return of(null);
      })
    );
  }
}

