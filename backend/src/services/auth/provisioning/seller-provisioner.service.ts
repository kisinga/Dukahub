import { Injectable } from '@nestjs/common';
import { RequestContext, Seller, TransactionalConnection } from '@vendure/core';
import { RegistrationInput } from '../registration.service';
import { RegistrationAuditorService } from './registration-auditor.service';
import { RegistrationErrorService } from './registration-error.service';

/**
 * Seller Provisioner Service
 *
 * Handles seller creation for each channel during registration.
 * LOB: Seller = Vendor entity for channel isolation and future-proofing.
 *
 * Creates one seller per channel to ensure proper separation of concerns
 * and prepare for any features that rely on seller-channel relationships.
 */
@Injectable()
export class SellerProvisionerService {
  constructor(
    private readonly connection: TransactionalConnection,
    private readonly auditor: RegistrationAuditorService,
    private readonly errorService: RegistrationErrorService
  ) {}

  /**
   * Create seller for new company registration
   * Each channel gets its own isolated seller entity
   */
  async createSeller(
    ctx: RequestContext,
    registrationData: RegistrationInput
  ): Promise<Seller> {
    try {
      const sellerName = `${registrationData.companyName} Seller`;
      const sellerRepo = this.connection.getRepository(ctx, Seller);

      // Check if seller with same name already exists (unlikely but safe)
      const existingSeller = await sellerRepo.findOne({
        where: { name: sellerName },
      });

      if (existingSeller) {
        // If seller exists, return it (shouldn't happen but handle gracefully)
        return existingSeller;
      }

      // Create new seller
      const newSeller = sellerRepo.create({
        name: sellerName,
      });

      const savedSeller = await sellerRepo.save(newSeller);

      // Audit log
      await this.auditor.logEntityCreated(ctx, 'Seller', savedSeller.id.toString(), savedSeller, {
        companyName: registrationData.companyName,
        companyCode: registrationData.companyCode,
      });

      return savedSeller;
    } catch (error: any) {
      this.errorService.logError('SellerProvisioner', error, 'Seller creation');
      throw this.errorService.wrapError(error, 'SELLER_CREATE_FAILED');
    }
  }
}

