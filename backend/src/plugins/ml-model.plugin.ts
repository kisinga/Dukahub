import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { MlAutoExtractService } from './ml-auto-extract.service';
import { MlExtractionQueueService } from './ml-extraction-queue.service';
import { MlExtractionQueueSubscriber } from './ml-extraction-queue.subscriber';
import { ML_MODEL_SCHEMA, MlModelResolver } from './ml-model-resolver';
import { MlTrainingService } from './ml-training.service';
import { MlWebhookService } from './ml-webhook.service';

/**
 * ML Model Plugin
 * 
 * Provides GraphQL API for managing ML models per channel.
 * ML model files are stored as Vendure Assets and linked to channels via custom fields.
 * 
 * Usage:
 * 1. Upload files via Admin UI (Catalog → Assets)
 * 2. Use linkMlModelAssets mutation to link them to channel
 * 3. Query model info via Shop API or Admin API
 * 4. Model files are served automatically by AssetServerPlugin
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [MlModelResolver, MlTrainingService, MlAutoExtractService, MlWebhookService, MlExtractionQueueService, MlExtractionQueueSubscriber],
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
