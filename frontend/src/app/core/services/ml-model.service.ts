import { Injectable, signal } from '@angular/core';
import { gql } from '@apollo/client';
import * as tf from '@tensorflow/tfjs';

/**
 * Model metadata structure
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

/**
 * Prediction result from ML model
 */
export interface ModelPrediction {
    className: string;
    probability: number;
}

/**
 * Error types for ML model operations
 */
export enum ModelErrorType {
    NOT_FOUND = 'NOT_FOUND',
    NETWORK_ERROR = 'NETWORK_ERROR',
    LOAD_ERROR = 'LOAD_ERROR',
    PREDICTION_ERROR = 'PREDICTION_ERROR',
    PERMISSION_ERROR = 'PERMISSION_ERROR',
}

/**
 * ML Model error with type and user-friendly message
 */
export interface ModelError {
    type: ModelErrorType;
    message: string;
    technicalDetails?: string;
}

/**
 * Service for managing ML model loading, caching, and inference
 * Follows the ML_MODEL_GUIDE.md specifications
 */
@Injectable({
    providedIn: 'root',
})
export class MlModelService {
    private model: tf.LayersModel | null = null;
    private metadata: ModelMetadata | null = null;
    private readonly isLoadingSignal = signal<boolean>(false);
    private readonly isInitializedSignal = signal<boolean>(false);
    private readonly errorSignal = signal<ModelError | null>(null);

    // Cache for model files using IndexedDB via TensorFlow.js
    private readonly MODEL_CACHE_NAME = 'dukahub-ml-models';

    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly isInitialized = this.isInitializedSignal.asReadonly();
    readonly error = this.errorSignal.asReadonly();

    /**
     * Execute GraphQL query using Apollo Client
     */
    private async queryGraphQL<T>(query: string, variables?: any): Promise<{ data?: T; errors?: any }> {
        try {
            // Use Apollo Client for GraphQL queries
            const apollo = (window as any).apolloClient;
            if (!apollo) {
                throw new Error('Apollo Client not available. Make sure it\'s properly configured.');
            }

            const result = await apollo.query({
                query: gql`${query}`,
                variables,
                fetchPolicy: 'network-only' // Always fetch fresh data
            });

            return { data: result.data };
        } catch (error: any) {
            console.error('GraphQL query error:', error);
            return { errors: error };
        }
    }

    /**
     * Check if model exists for the given channel using GraphQL API
     * Returns { exists: boolean, error?: ModelError }
     */
    async checkModelExists(channelId: string): Promise<{ exists: boolean; error?: ModelError }> {
        try {
            // Use GraphQL API instead of direct file access
            const response = await this.queryGraphQL<{
                mlModelInfo: {
                    hasModel: boolean;
                    version?: string;
                    status?: string;
                }
            }>(`
                query CheckMlModel($channelId: ID!) {
                    mlModelInfo(channelId: $channelId) {
                        hasModel
                        version
                        status
                    }
                }
            `, { channelId });

            if (response.data?.mlModelInfo?.hasModel) {
                return { exists: true };
            }

            return {
                exists: false,
                error: {
                    type: ModelErrorType.NOT_FOUND,
                    message: 'No ML model found for this store. Upload a model first to use product recognition.',
                    technicalDetails: `No ML model configured for channel ${channelId}`
                }
            };
        } catch (error: any) {
            console.error('Error checking model existence:', error);
            return {
                exists: false,
                error: {
                    type: ModelErrorType.NETWORK_ERROR,
                    message: 'Network error while checking for ML model. Check your connection.',
                    technicalDetails: error.message
                }
            };
        }
    }

    /**
     * Load model for the given channel using API endpoints
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
            // First check if model exists via API
            const existsCheck = await this.checkModelExists(channelId);
            if (!existsCheck.exists) {
                this.errorSignal.set(existsCheck.error!);
                return false;
            }

            // Set TensorFlow backend
            await tf.setBackend('webgl');
            await tf.ready();
            console.log(`🔧 TensorFlow.js backend ready: ${tf.getBackend()}`);

            // Use API endpoints instead of direct file access
            const baseUrl = `/admin-api/ml-models/${channelId}/`;
            const modelUrl = `${baseUrl}model.json`;
            const cacheKey = `indexeddb://${this.MODEL_CACHE_NAME}/${channelId}`;

            // Load metadata first via API
            console.log('📄 Loading model metadata via API...');
            this.metadata = await this.fetchMetadataFromAPI(channelId);

            // Try loading from IndexedDB cache first
            try {
                console.log('💾 Attempting to load model from IndexedDB cache...');
                this.model = await tf.loadLayersModel(cacheKey);
                console.log('✅ Model loaded from IndexedDB cache (offline-ready)');
            } catch (cacheError) {
                // Cache miss - load from API and save to cache
                console.log('🌐 Cache miss, loading from API...');
                this.model = await tf.loadLayersModel(modelUrl);

                // Save to IndexedDB for future offline use
                console.log('💾 Saving model to IndexedDB cache...');
                await this.model.save(cacheKey);
                console.log('✅ Model cached to IndexedDB for offline use');
            }

            this.isInitializedSignal.set(true);
            console.log('✅ Model ready:', {
                channelId,
                productCount: this.metadata.productCount,
                imageCount: this.metadata.imageCount,
                labels: this.metadata.labels.length,
            });

            return true;
        } catch (error: any) {
            console.error('❌ Failed to load model:', error);
            const modelError = this.parseError(error);
            this.errorSignal.set(modelError);
            this.model = null;
            this.metadata = null;
            this.isInitializedSignal.set(false);
            return false;
        } finally {
            this.isLoadingSignal.set(false);
        }
    }

    /**
     * Fetch metadata from API instead of direct file access
     */
    private async fetchMetadataFromAPI(channelId: string): Promise<ModelMetadata> {
        try {
            // Get metadata via GraphQL API
            const response = await this.queryGraphQL<{
                mlModelInfo: {
                    trainedAt?: string;
                    productCount?: number;
                    imageCount?: number;
                    labels?: string[];
                    version?: string;
                    status?: string;
                }
            }>(`
                query GetMlModelInfo($channelId: ID!) {
                    mlModelInfo(channelId: $channelId) {
                        trainedAt
                        productCount
                        imageCount
                        labels
                        version
                        status
                    }
                }
            `, { channelId });

            if (!response.data?.mlModelInfo) {
                throw new Error('Model metadata not found. Please upload a model first.');
            }

            const info = response.data.mlModelInfo;

            // Fetch the actual metadata file
            const metadataUrl = `/admin-api/ml-models/${channelId}/metadata.json`;
            const metadataResponse = await fetch(metadataUrl);

            if (!metadataResponse.ok) {
                throw new Error(`Failed to fetch metadata file: HTTP ${metadataResponse.status}`);
            }

            const metadata = await metadataResponse.json();

            return {
                version: info.version || metadata.version || '1.0.0',
                trainedAt: info.trainedAt || metadata.trainedAt || new Date().toISOString(),
                channelId,
                productCount: info.productCount || metadata.productCount || 0,
                imageCount: info.imageCount || metadata.imageCount || 0,
                trainingDuration: metadata.trainingDuration || 0,
                labels: info.labels || metadata.labels || [],
                imageSize: metadata.imageSize || 224,
                modelType: metadata.modelType || 'teachable-machine',
            };
        } catch (error: any) {
            console.error('Error fetching metadata from API:', error);
            throw new Error(`Failed to load model metadata: ${error.message}`);
        }
    }

    /**
     * Parse error into user-friendly ModelError
     */
    private parseError(error: any): ModelError {
        const message = error.message || 'Unknown error';

        // Check for 404 errors
        if (message.includes('not found') || message.includes('404')) {
            return {
                type: ModelErrorType.NOT_FOUND,
                message: 'ML model files not found. Please train a model for your store first.',
                technicalDetails: message
            };
        }

        // Network errors
        if (message.includes('fetch') || message.includes('network') || message.includes('Failed to fetch')) {
            return {
                type: ModelErrorType.NETWORK_ERROR,
                message: 'Network error while loading model. Check your internet connection.',
                technicalDetails: message
            };
        }

        // TensorFlow/loading errors
        if (message.includes('TensorFlow') || message.includes('model') || message.includes('load')) {
            return {
                type: ModelErrorType.LOAD_ERROR,
                message: 'Failed to load ML model. The model may be corrupted or incompatible.',
                technicalDetails: message
            };
        }

        // Generic error
        return {
            type: ModelErrorType.LOAD_ERROR,
            message: 'Failed to load ML model. Please try again or contact support.',
            technicalDetails: message
        };
    }

    /**
     * Run prediction on image or video element
     * Returns top K predictions sorted by probability
     */
    async predict(
        imageElement: HTMLImageElement | HTMLVideoElement,
        topK: number = 3
    ): Promise<ModelPrediction[]> {
        if (!this.model || !this.metadata) {
            const error: ModelError = {
                type: ModelErrorType.PREDICTION_ERROR,
                message: 'Cannot make predictions - model not loaded.',
                technicalDetails: 'Model must be loaded before calling predict()'
            };
            this.errorSignal.set(error);
            throw new Error(error.message);
        }

        try {
            // Preprocess the image
            const tensor = tf.tidy(() => {
                // Convert image to tensor
                let img = tf.browser.fromPixels(imageElement);

                // Resize to model's expected input size (typically 224x224 for Teachable Machine)
                const imageSize = this.metadata?.imageSize || 224;
                img = tf.image.resizeBilinear(img, [imageSize, imageSize]);

                // Normalize to [0, 1] range
                img = img.toFloat().div(255.0);

                // Add batch dimension
                return img.expandDims(0);
            });

            // Run inference
            const predictions = this.model.predict(tensor) as tf.Tensor;
            const probabilities = await predictions.data();

            // Clean up tensors
            tensor.dispose();
            predictions.dispose();

            // Get labels from metadata
            const labels = this.metadata.labels;

            // Create prediction array with labels and probabilities
            const results: ModelPrediction[] = labels.map((label, i) => ({
                className: label,
                probability: probabilities[i]
            }));

            // Sort by probability (descending) and take top K
            results.sort((a, b) => b.probability - a.probability);
            return results.slice(0, topK);
        } catch (error: any) {
            console.error('Prediction error:', error);
            const modelError: ModelError = {
                type: ModelErrorType.PREDICTION_ERROR,
                message: 'Failed to recognize product. Please try again with better lighting.',
                technicalDetails: error.message
            };
            this.errorSignal.set(modelError);
            throw error;
        }
    }

    /**
     * Get product ID from model prediction label
     * Labels in the model are product IDs
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
     * Unload model from memory (cached version stays in IndexedDB)
     */
    unloadModel(): void {
        if (this.model) {
            // Dispose TensorFlow tensors
            this.model.dispose();
            this.model = null;
            this.metadata = null;
            this.isInitializedSignal.set(false);
            this.errorSignal.set(null);
            console.log('🗑️ Model unloaded from memory (cache preserved)');
        }
    }

    /**
     * Clear model from IndexedDB cache completely
     */
    async clearModelCache(channelId: string): Promise<void> {
        try {
            const cacheKey = `indexeddb://${this.MODEL_CACHE_NAME}/${channelId}`;

            // Unload from memory first
            this.unloadModel();

            // Remove from IndexedDB
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
     * Check if cached model needs update using API
     */
    async checkForUpdate(channelId: string): Promise<boolean> {
        if (!this.metadata) return true;

        try {
            // Get current model info via API
            const response = await this.queryGraphQL<{
                mlModelInfo: {
                    trainedAt?: string;
                    version?: string;
                }
            }>(`
                query GetMlModelInfo($channelId: ID!) {
                    mlModelInfo(channelId: $channelId) {
                        trainedAt
                        version
                    }
                }
            `, { channelId });

            if (!response.data?.mlModelInfo) return false;

            const remoteInfo = response.data.mlModelInfo;

            // Compare cached vs remote training time
            const cachedTime = new Date(this.metadata.trainedAt);
            const remoteTime = new Date(remoteInfo.trainedAt || '');

            return remoteTime > cachedTime;
        } catch (error) {
            console.error('Error checking for model update:', error);
            return false;
        }
    }
}

