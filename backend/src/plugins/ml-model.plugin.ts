import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { ML_MODEL_SCHEMA, MlModelResolver } from './ml-model-resolver';

/**
 * ML Model Plugin
 * 
 * Provides GraphQL API for managing ML models per channel.
 * ML model files are stored as Vendure Assets and linked to channels via custom fields.
 * 
 * Usage:
 * 1. Upload model files via Admin API mutations
 * 2. Query model info via Shop API or Admin API
 * 3. Model files are served automatically by AssetServerPlugin
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [MlModelResolver],
    adminApiExtensions: {
        schema: ML_MODEL_SCHEMA,
        resolvers: [MlModelResolver],
    },
    shopApiExtensions: {
        schema: ML_MODEL_SCHEMA,
        resolvers: [MlModelResolver],
    },
})
export class MlModelPlugin { }
