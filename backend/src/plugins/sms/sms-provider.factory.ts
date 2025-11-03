import { Injectable } from '@nestjs/common';
import { ISmsProvider } from './interfaces/sms-provider.interface';
import { HostpinnacleProvider } from './providers/hostpinnacle.provider';

/**
 * SMS Provider Factory
 * 
 * Creates and manages SMS provider instances based on configuration.
 * Supports runtime provider switching via SMS_PROVIDER environment variable.
 */
@Injectable()
export class SmsProviderFactory {
    private providerCache: Map<string, ISmsProvider> = new Map();

    /**
     * Get the active SMS provider instance
     * Uses singleton pattern to ensure only one instance per provider type
     */
    getProvider(): ISmsProvider {
        const providerName = (process.env.SMS_PROVIDER || 'hostpinnacle').toLowerCase();

        // Return cached instance if available
        if (this.providerCache.has(providerName)) {
            return this.providerCache.get(providerName)!;
        }

        // Create new provider instance
        const provider = this.createProvider(providerName);

        // Cache the instance
        this.providerCache.set(providerName, provider);

        return provider;
    }

    /**
     * Create a provider instance based on provider name
     */
    private createProvider(providerName: string): ISmsProvider {
        switch (providerName) {
            case 'hostpinnacle':
                return new HostpinnacleProvider();

            // Future providers can be added here:
            // case 'twilio':
            //     return new TwilioProvider();
            // case 'aws-sns':
            //     return new AwsSnsProvider();
            // case 'mock':
            //     return new MockSmsProvider();

            default:
                console.warn(
                    `[SMS Factory] Unknown provider "${providerName}", falling back to hostpinnacle`
                );
                return new HostpinnacleProvider();
        }
    }

    /**
     * Clear provider cache (useful for testing or provider switching)
     */
    clearCache(): void {
        this.providerCache.clear();
    }

    /**
     * Get a specific provider by name (for testing or advanced use cases)
     */
    getProviderByName(providerName: string): ISmsProvider {
        const normalizedName = providerName.toLowerCase();
        if (this.providerCache.has(normalizedName)) {
            return this.providerCache.get(normalizedName)!;
        }
        const provider = this.createProvider(normalizedName);
        this.providerCache.set(normalizedName, provider);
        return provider;
    }
}

