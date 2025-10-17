import { Injectable, inject } from '@angular/core';
import { CompanyService } from './company.service';

/**
 * Currency formatting service
 * 
 * ARCHITECTURE:
 * - Uses channel's defaultCurrencyCode from CompanyService
 * - Price field already includes tax (channels configured with pricesIncludeTax: true)
 * - KISS: Simple, consistent currency formatting across the app
 * 
 * CRITICAL BEHAVIOR:
 * - This service ALWAYS converts from cents to currency units
 * - All Vendure prices are stored in cents in the database
 * - Services should pass raw cents from GraphQL responses directly to this formatter
 * - No manual division by 100 needed in components or services
 * 
 * USAGE:
 * ```ts
 * readonly currencyService = inject(CurrencyService);
 * const formatted = this.currencyService.format(priceInCents); // Pass cents directly
 * ```
 */
@Injectable({
    providedIn: 'root',
})
export class CurrencyService {
    private readonly companyService = inject(CompanyService);

    /**
     * Get the current channel currency code
     */
    readonly currency = this.companyService.channelCurrency;

    /**
     * Format a price amount with the channel currency
     * 
     * @param amount - Price amount in CENTS (minor units from Vendure database)
     * @param showCurrency - Whether to include the currency code (default: true)
     * @returns Formatted price string (e.g., "KES 100.50" or "KES 100" for whole numbers)
     * 
     * IMPORTANT: This service ALWAYS converts from cents to currency units.
     * All Vendure prices are stored in cents in the database, so this service
     * automatically divides by 100 to display the correct amount to users.
     * 
     * Example: amount=15000 cents → displays "KES 150.00"
     * Example: amount=1250 cents → displays "KES 12.50"
     * 
     * Services should pass raw cents from GraphQL responses directly to this formatter.
     */
    format(amount: number, showCurrency: boolean = true): string {
        const currency = this.currency();

        // ALWAYS convert from cents to currency units
        const amountInCurrencyUnits = amount / 100;
        // Only show decimals if the amount has a fractional part
        const hasDecimals = amountInCurrencyUnits % 1 !== 0;
        const formattedAmount = Math.abs(amountInCurrencyUnits).toLocaleString('en-KE', {
            minimumFractionDigits: hasDecimals ? 2 : 0,
            maximumFractionDigits: 2,
        });

        if (showCurrency) {
            const prefix = amountInCurrencyUnits < 0 ? '-' : '';
            return `${prefix}${currency} ${formattedAmount}`;
        }

        return formattedAmount;
    }

    /**
     * Get currency symbol (for compact display)
     * Maps common currency codes to symbols
     */
    getSymbol(): string {
        const currency = this.currency();
        const symbolMap: Record<string, string> = {
            'KES': 'KSh',
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
        };
        return symbolMap[currency] || currency;
    }
}

