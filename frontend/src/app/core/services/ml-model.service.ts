import { inject, Injectable, signal } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import { GET_ML_MODEL_ASSETS } from '../graphql/operations.graphql';
import { ApolloService } from './apollo.service';
import { CompanyService } from './company.service';

/**
 * ML Model Service
 *
 * Architecture: Tag-based versioning + custom field activation
 * - Active model: Asset IDs in Channel.customFields
 * - Versioning: Assets tagged with channel-{id}, v{version}, trained-{date}
 * - Loading: Query customFields → Fetch assets → Load from /assets/{source}
 * - Caching: IndexedDB via TensorFlow.js (version-keyed)
 *
 * Deployment: backend/scripts/deploy-ml-model.js
 * Documentation: ML_GUIDE.md
 */

export interface ModelMetadata {
    version: string;
    trainedAt: string;
    channelId: string;
    productCount: number;
    imageCount: number;
    trainingDuration: number;
    labels: string[];
    imageSize: number;
    modelType: string;
}

export interface ModelPrediction {
    className: string;
    probability: number;
}

export enum ModelErrorType {
    NOT_FOUND = 'NOT_FOUND',
    NETWORK_ERROR = 'NETWORK_ERROR',
    LOAD_ERROR = 'LOAD_ERROR',
    PREDICTION_ERROR = 'PREDICTION_ERROR',
    PERMISSION_ERROR = 'PERMISSION_ERROR',
}

export interface ModelError {
    type: ModelErrorType;
    message: string;
    technicalDetails?: string;
}

@Injectable({
    providedIn: 'root',
})
export class MlModelService {
    private readonly apolloService = inject(ApolloService);
    private readonly companyService = inject(CompanyService);

    private model: tf.LayersModel | null = null;
    private metadata: ModelMetadata | null = null;
    private readonly isLoadingSignal = signal<boolean>(false);
    private readonly isInitializedSignal = signal<boolean>(false);
    private readonly errorSignal = signal<ModelError | null>(null);

    private readonly MODEL_CACHE_NAME = 'dukahub-ml-models';

    // Cache for asset sources to prevent duplicate queries
    private assetSourcesCache = new Map<string, {
        modelUrl: string;
        weightsUrl: string;
        metadataUrl: string;
    } | null>();

    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly isInitialized = this.isInitializedSignal.asReadonly();
    readonly error = this.errorSignal.asReadonly();

    /**
     * Get ML model asset sources for a channel
     * Returns file paths needed to load the model
     * Uses CompanyService as single source of truth for channel custom fields
     */
    private async getModelSources(channelId: string): Promise<{
        modelUrl: string;
        weightsUrl: string;
        metadataUrl: string;
    } | null> {
        // Check cache first to prevent duplicate queries
        const cacheKey = channelId;
        if (this.assetSourcesCache.has(cacheKey)) {
            return this.assetSourcesCache.get(cacheKey) || null;
        }

        const client = this.apolloService.getClient();

        // Get asset IDs from CompanyService (already fetched on boot)
        const assetIds = this.companyService.mlModelAssetIds();

        if (!assetIds) {
            this.assetSourcesCache.set(cacheKey, null);
            return null;
        }

        try {
            // Get asset source paths using the IDs from CompanyService
            const assetsResult = await client.query<{
                assets: {
                    items: Array<{
                        id: string;
                        source: string;
                    }>;
                };
            }>({
                query: GET_ML_MODEL_ASSETS,
                variables: {
                    ids: [assetIds.mlModelJsonId, assetIds.mlModelBinId, assetIds.mlMetadataId],
                },
                fetchPolicy: 'network-only',
                errorPolicy: 'all', // Return partial data even if there are errors
            });

            if (assetsResult.error) {
                console.error('❌ Assets query error:', assetsResult.error);
            }

            const assets = assetsResult.data?.assets?.items || [];

            if (assets.length === 0) {
                console.error('❌ No assets found for ML model IDs:', {
                    requestedIds: [assetIds.mlModelJsonId, assetIds.mlModelBinId, assetIds.mlMetadataId],
                    foundAssets: assets
                });
                return null;
            }

            const modelAsset = assets.find((a: any) => a.id === assetIds.mlModelJsonId);
            const weightsAsset = assets.find((a: any) => a.id === assetIds.mlModelBinId);
            const metadataAsset = assets.find((a: any) => a.id === assetIds.mlMetadataId);


            if (!modelAsset || !weightsAsset || !metadataAsset) {
                console.error('❌ Missing required assets:', {
                    hasModelAsset: !!modelAsset,
                    hasWeightsAsset: !!weightsAsset,
                    hasMetadataAsset: !!metadataAsset,
                    availableAssets: assets.map(a => ({ id: a.id, source: a.source }))
                });
                return null;
            }

            // Helper: convert source to URL (handle proxy scenarios)
            const toUrl = (source: string): string => {
                // If source is already a full URL, extract the path for proxy compatibility
                if (source.startsWith('http://') || source.startsWith('https://')) {
                    // Extract path from full URL for proxy compatibility
                    // "http://localhost:3000/assets/source/fa/model__02.json" -> "/assets/source/fa/model__02.json"
                    const url = new URL(source);
                    return url.pathname;
                }
                // The source field from Vendure contains the relative path within asset storage
                // We need to construct the proper asset URL by prepending /assets/
                // Source format: "source/49/metadata.json" -> URL: "/assets/source/49/metadata.json"
                return `/assets/${source}`;
            };

            const sources = {
                modelUrl: toUrl(modelAsset.source),
                weightsUrl: toUrl(weightsAsset.source),
                metadataUrl: toUrl(metadataAsset.source),
            };

            console.log('✅ ML model sources resolved');

            // Cache the results to prevent duplicate queries
            this.assetSourcesCache.set(cacheKey, sources);
            return sources;

        } catch (error: any) {
            console.error('❌ Failed to fetch ML model assets:', error);
            console.error('❌ Error details:', {
                message: error.message,
                graphQLErrors: error.graphQLErrors,
                networkError: error.networkError
            });

            // Cache the failure to prevent repeated attempts
            this.assetSourcesCache.set(cacheKey, null);
            return null;
        }
    }

    /**
     * Check if model exists for the given channel
     */
    async checkModelExists(channelId: string): Promise<{ exists: boolean; error?: ModelError }> {
        try {
            const sources = await this.getModelSources(channelId);

            if (!sources) {
                return {
                    exists: false,
                    error: {
                        type: ModelErrorType.NOT_FOUND,
                        message: 'No ML model found for this store. Upload a model first to use product recognition.',
                        technicalDetails: `ML model not configured for channel ${channelId}`,
                    },
                };
            }

            return { exists: true };
        } catch (error: any) {
            return {
                exists: false,
                error: {
                    type: ModelErrorType.NETWORK_ERROR,
                    message: 'Network error while checking for ML model. Check your connection.',
                    technicalDetails: error.message,
                },
            };
        }
    }

    /**
     * Load model for the given channel
     * Uses IndexedDB caching via TensorFlow.js for offline operation
     */
    async loadModel(channelId: string): Promise<boolean> {
        if (this.model) {
            return true;
        }

        this.isLoadingSignal.set(true);
        this.errorSignal.set(null);

        try {
            // Get model file URLs
            const sources = await this.getModelSources(channelId);

            if (!sources) {
                throw new Error('ML model not configured for this channel. Please set up the model asset IDs in channel settings.');
            }

            // Initialize TensorFlow backend
            await tf.setBackend('webgl');
            await tf.ready();
            const metadataResponse = await fetch(sources.metadataUrl);
            if (!metadataResponse.ok) {
                throw new Error(`Failed to fetch metadata: HTTP ${metadataResponse.status}`);
            }
            const metadata = await metadataResponse.json();
            this.metadata = { ...metadata, channelId };

            // Try loading from IndexedDB cache
            const cacheKey = `indexeddb://${this.MODEL_CACHE_NAME}/${channelId}`;

            try {
                this.model = await tf.loadLayersModel(cacheKey);
            } catch {
                // Cache miss - load from network
                this.model = await tf.loadLayersModel(sources.modelUrl);
                await this.model.save(cacheKey);
            }

            this.isInitializedSignal.set(true);
            return true;
        } catch (error: any) {
            console.error('❌ Failed to load model:', error);
            this.errorSignal.set(this.parseError(error));
            this.model = null;
            this.metadata = null;
            this.isInitializedSignal.set(false);
            return false;
        } finally {
            this.isLoadingSignal.set(false);
        }
    }

    /**
     * Run prediction on image or video element
     */
    async predict(
        imageElement: HTMLImageElement | HTMLVideoElement,
        topK: number = 3
    ): Promise<ModelPrediction[]> {
        if (!this.model || !this.metadata) {
            const error: ModelError = {
                type: ModelErrorType.PREDICTION_ERROR,
                message: 'Cannot make predictions - model not loaded.',
                technicalDetails: 'Model must be loaded before calling predict()',
            };
            this.errorSignal.set(error);
            throw new Error(error.message);
        }

        try {
            const tensor = tf.tidy(() => {
                let img = tf.browser.fromPixels(imageElement);
                const imageSize = this.metadata?.imageSize || 224;
                img = tf.image.resizeBilinear(img, [imageSize, imageSize]);
                img = img.toFloat().div(255.0);
                return img.expandDims(0);
            });

            const predictions = this.model.predict(tensor) as tf.Tensor;
            const probabilities = await predictions.data();

            tensor.dispose();
            predictions.dispose();

            const labels = this.metadata.labels;
            const results: ModelPrediction[] = labels.map((label, i) => ({
                className: label,
                probability: probabilities[i],
            }));

            results.sort((a, b) => b.probability - a.probability);
            return results.slice(0, topK);
        } catch (error: any) {
            console.error('Prediction error:', error);
            const modelError: ModelError = {
                type: ModelErrorType.PREDICTION_ERROR,
                message: 'Failed to recognize product. Please try again with better lighting.',
                technicalDetails: error.message,
            };
            this.errorSignal.set(modelError);
            throw error;
        }
    }

    /**
     * Get product ID from model prediction label
     */
    getProductIdFromLabel(label: string): string {
        return label;
    }

    /**
     * Get current model metadata
     */
    getMetadata(): ModelMetadata | null {
        return this.metadata;
    }

    /**
     * Clear error state
     */
    clearError(): void {
        this.errorSignal.set(null);
    }

    /**
     * Unload model from memory
     */
    unloadModel(): void {
        if (this.model) {
            this.model.dispose();
            this.model = null;
            this.metadata = null;
            this.isInitializedSignal.set(false);
            this.errorSignal.set(null);
        }
    }

    /**
     * Clear model from IndexedDB cache
     */
    async clearModelCache(channelId: string): Promise<void> {
        try {
            const cacheKey = `indexeddb://${this.MODEL_CACHE_NAME}/${channelId}`;
            this.unloadModel();

            const models = await tf.io.listModels();
            if (models[cacheKey]) {
                await tf.io.removeModel(cacheKey);
            }
        } catch (error) {
            console.error('Error clearing model cache:', error);
        }
    }

    /**
     * Clear asset sources cache (useful when channel changes)
     */
    clearAssetSourcesCache(): void {
        this.assetSourcesCache.clear();
    }

    /**
     * Check if cached model needs update
     */
    async checkForUpdate(channelId: string): Promise<boolean> {
        if (!this.metadata) return true;

        try {
            const sources = await this.getModelSources(channelId);
            if (!sources) return false;

            const metadataResponse = await fetch(sources.metadataUrl);
            if (!metadataResponse.ok) return false;

            const remoteMetadata = await metadataResponse.json();

            const cachedTime = new Date(this.metadata.trainedAt);
            const remoteTime = new Date(remoteMetadata.trainedAt || '');

            return remoteTime > cachedTime;
        } catch (error) {
            console.error('Error checking for model update:', error);
            return false;
        }
    }

    /**
     * Parse error into user-friendly ModelError
     */
    private parseError(error: any): ModelError {
        const message = error.message || 'Unknown error';

        if (message.includes('not found') || message.includes('404')) {
            return {
                type: ModelErrorType.NOT_FOUND,
                message: 'ML model files not found. Please train a model for your store first.',
                technicalDetails: message,
            };
        }

        if (message.includes('fetch') || message.includes('network') || message.includes('Failed to fetch')) {
            return {
                type: ModelErrorType.NETWORK_ERROR,
                message: 'Network error while loading model. Check your internet connection.',
                technicalDetails: message,
            };
        }

        if (message.includes('TensorFlow') || message.includes('model') || message.includes('load')) {
            return {
                type: ModelErrorType.LOAD_ERROR,
                message: 'Failed to load ML model. The model may be corrupted or incompatible.',
                technicalDetails: message,
            };
        }

        return {
            type: ModelErrorType.LOAD_ERROR,
            message: 'Failed to load ML model. Please try again or contact support.',
            technicalDetails: message,
        };
    }
}
