import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { EnvironmentConfig } from '../../infrastructure/config/environment.config';

/**
 * Environment Configuration Plugin
 * 
 * Registers the EnvironmentConfig service to make it available
 * throughout the application via Dependency Injection.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [EnvironmentConfig],
    exports: [EnvironmentConfig],
})
export class EnvironmentPlugin { }

