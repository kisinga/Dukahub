import { inject, Injectable, signal } from '@angular/core';
import { gql } from '@apollo/client';
import * as tf from '@tensorflow/tfjs';
import { ApolloService } from './apollo.service';

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

    private model: tf.LayersModel | null = null;
    private metadata: ModelMetadata | null = null;
    private readonly isLoadingSignal = signal<boolean>(false);
    private readonly isInitializedSignal = signal<boolean>(false);
    private readonly errorSignal = signal<ModelError | null>(null);

    private readonly MODEL_CACHE_NAME = 'dukahub-ml-models';

    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly isInitialized = this.isInitializedSignal.asReadonly();
    readonly error = this.errorSignal.asReadonly();

    /**
     * Get ML model asset sources for a channel
     * Returns file paths needed to load the model
     */
    private async getModelSources(channelId: string): Promise<{
        modelUrl: string;
        weightsUrl: string;
        metadataUrl: string;
    } | null> {
        const client = this.apolloService.getClient();

        // Get asset IDs from channel custom fields
        const channelResult = await client.query<{
            channel: {
                customFields: {
                    mlModelJsonId?: string;
                    mlModelBinId?: string;
                    mlMetadataId?: string;
                };
            } | null;
        }>({
            query: gql`
                query GetChannelMLModel($id: ID!) {
                    channel(id: $id) {
                        customFields {
                            mlModelJsonId
                            mlModelBinId
                            mlMetadataId
                        }
                    }
                }
            `,
            variables: { id: channelId },
            fetchPolicy: 'network-only',
        });

        const customFields = channelResult.data?.channel?.customFields;

        if (!customFields?.mlModelJsonId || !customFields?.mlModelBinId || !customFields?.mlMetadataId) {
            return null;
        }

        // Get asset source paths
        const assetsResult = await client.query<{
            assets: {
                items: Array<{
                    id: string;
                    source: string;
                }>;
            };
        }>({
            query: gql`
                query GetMLModelAssets($ids: [String!]!) {
                    assets(options: { filter: { id: { in: $ids } } }) {
                        items {
                            id
                            source
                        }
                    }
                }
            `,
            variables: {
                ids: [customFields.mlModelJsonId, customFields.mlModelBinId, customFields.mlMetadataId],
            },
            fetchPolicy: 'network-only',
        });

        const assets = assetsResult.data?.assets?.items || [];

        const modelAsset = assets.find((a: any) => a.id === customFields.mlModelJsonId);
        const weightsAsset = assets.find((a: any) => a.id === customFields.mlModelBinId);
        const metadataAsset = assets.find((a: any) => a.id === customFields.mlMetadataId);

        if (!modelAsset || !weightsAsset || !metadataAsset) {
            return null;
        }

        // Helper: convert source to URL (handle both relative paths and full URLs)
        const toUrl = (source: string): string => {
            // If source is already a full URL, use it as-is
            if (source.startsWith('http://') || source.startsWith('https://')) {
                return source;
            }
            // Otherwise, prepend /assets/
            return `/assets/${source}`;
        };

        return {
            modelUrl: toUrl(modelAsset.source),
            weightsUrl: toUrl(weightsAsset.source),
            metadataUrl: toUrl(metadataAsset.source),
        };
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
            console.log('✅ Model already loaded in memory');
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
            console.log(`🔧 TensorFlow.js backend ready: ${tf.getBackend()}`);

            // Load metadata
            console.log('📄 Loading metadata from:', sources.metadataUrl);
            const metadataResponse = await fetch(sources.metadataUrl);
            if (!metadataResponse.ok) {
                throw new Error(`Failed to fetch metadata: HTTP ${metadataResponse.status}`);
            }
            const metadata = await metadataResponse.json();
            this.metadata = { ...metadata, channelId };

            // Try loading from IndexedDB cache
            const cacheKey = `indexeddb://${this.MODEL_CACHE_NAME}/${channelId}`;

            try {
                console.log('💾 Loading from IndexedDB cache...');
                this.model = await tf.loadLayersModel(cacheKey);
                console.log('✅ Model loaded from cache');
            } catch {
                // Cache miss - load from network
                console.log('🌐 Loading from network:', sources.modelUrl);
                this.model = await tf.loadLayersModel(sources.modelUrl);

                // Save to cache
                console.log('💾 Caching model...');
                await this.model.save(cacheKey);
                console.log('✅ Model cached');
            }

            this.isInitializedSignal.set(true);

            console.log('✅ Model ready:', {
                channelId,
                version: this.metadata?.version,
                productCount: this.metadata?.productCount,
                labels: this.metadata?.labels?.length || 0,
            });

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
            console.log('🗑️ Model unloaded from memory');
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
                console.log(`🗑️ Model cache cleared for channel ${channelId}`);
            }
        } catch (error) {
            console.error('Error clearing model cache:', error);
        }
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
