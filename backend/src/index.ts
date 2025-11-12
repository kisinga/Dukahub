import { bootstrap, runMigrations } from '@vendure/core';
import { config } from './vendure-config';
import { OtpTokenAuthStrategy } from './plugins/auth/otp-token-auth.strategy';

// Run migrations first, then bootstrap the application
runMigrations(config)
    .then(async () => {
        // Bootstrap the application
        const app = await bootstrap(config);
        
        // Register OTP token auth strategy after bootstrap when DI container is ready
        // Strategy must be first to check tokens before native password auth
        
        // Get the strategy instance from the app's DI container (this is the properly initialized one)
        const diStrategy = app.get(OtpTokenAuthStrategy);
        
        // Initialize array if it doesn't exist
        if (!config.authOptions.adminAuthenticationStrategy) {
            config.authOptions.adminAuthenticationStrategy = [];
        }
        
        // Find the manually created strategy instance (the one without proper DI)
        // Look for any OtpTokenAuthStrategy that doesn't have OtpService initialized
        const manualStrategyIndex = config.authOptions.adminAuthenticationStrategy.findIndex(
            (s: any) => {
                const isOtpStrategy = s?.constructor?.name === 'OtpTokenAuthStrategy';
                const hasOtpService = !!(s as any)?.otpService;
                return isOtpStrategy && !hasOtpService;
            }
        );
        
        if (manualStrategyIndex !== -1) {
            // Replace the manually created instance with the DI instance
            config.authOptions.adminAuthenticationStrategy[manualStrategyIndex] = diStrategy;
        } else {
            // Check if DI strategy is already in the array
            const existingIndex = config.authOptions.adminAuthenticationStrategy.indexOf(diStrategy);
            if (existingIndex === -1) {
                // Add DI strategy at the beginning
                config.authOptions.adminAuthenticationStrategy.unshift(diStrategy);
            }
        }
        
        return app;
    })
    .catch(err => {
        console.error('❌ Failed to start application:', err);
        process.exit(1);
    });
