import { compileUiExtensions } from '@vendure/ui-devkit/compiler';
import path from 'path';

/**
 * Compile Admin UI Extensions
 *
 * This script compiles the subscription tier management admin UI extensions
 * and outputs them to the admin-ui directory for integration with Vendure.
 */
compileUiExtensions({
  outputPath: path.join(__dirname, '../../admin-ui'),
  extensions: [
    {
      // Resolve to source files (admin-ui is excluded from compilation)
      // When running from dist, go up to find source directory
      extensionPath: path.join(__dirname.replace(/\/dist\//, '/'), 'plugins/subscriptions/admin-ui'),
      ngModules: [
        {
          type: 'lazy',
          route: 'subscription-tiers',
          ngModuleFileName: 'subscription-tier.module.ts',
          ngModuleName: 'SubscriptionTierModule',
        },
      ],
      routes: [
        {
          route: 'subscription-tiers',
          filePath: 'routes.ts',
        },
      ],
    },
  ],
  devMode: process.env.NODE_ENV !== 'production',
})
  .compile?.()
  .then(() => {
    console.log('✅ Admin UI extensions compiled successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Failed to compile admin UI extensions:', err);
    process.exit(1);
  });

