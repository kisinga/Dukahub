import { Injectable, signal } from '@angular/core';
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
     * Check if model exists for the given channel
     * Returns { exists: boolean, error?: ModelError }
     */
    async checkModelExists(channelId: string): Promise<{ exists: boolean; error?: ModelError }> {
        try {
            const metadataUrl = `/assets/ml-models/${channelId}/latest/metadata.json`;
            const response = await fetch(metadataUrl, { method: 'HEAD' });

            if (response.ok) {
                return { exists: true };
            }

            if (response.status === 404) {
                return {
                    exists: false,
                    error: {
                        type: ModelErrorType.NOT_FOUND,
                        message: 'No ML model found for this store. Train a model first to use product recognition.',
                        technicalDetails: `Model not found at: ${metadataUrl}`
                    }
                };
            }

            return {
                exists: false,
                error: {
                    type: ModelErrorType.NETWORK_ERROR,
                    message: `Failed to check model availability (HTTP ${response.status})`,
                    technicalDetails: `${response.status} ${response.statusText}`
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
            // First check if model exists on server
            const existsCheck = await this.checkModelExists(channelId);
            if (!existsCheck.exists) {
                this.errorSignal.set(existsCheck.error!);
                return false;
            }

            // Set TensorFlow backend
            await tf.setBackend('webgl');
            await tf.ready();
            console.log(`🔧 TensorFlow.js backend ready: ${tf.getBackend()}`);

            const baseUrl = `/assets/ml-models/${channelId}/latest/`;
            const modelUrl = `${baseUrl}model.json`;
            const cacheKey = `indexeddb://${this.MODEL_CACHE_NAME}/${channelId}`;

            // Load metadata first (lightweight, no need to cache separately)
            console.log('📄 Loading model metadata...');
            this.metadata = await this.fetchMetadata(`${baseUrl}metadata.json`);

            // Try loading from IndexedDB cache first
            try {
                console.log('💾 Attempting to load model from IndexedDB cache...');
                this.model = await tf.loadLayersModel(cacheKey);
                console.log('✅ Model loaded from IndexedDB cache (offline-ready)');
            } catch (cacheError) {
                // Cache miss - load from network and save to cache
                console.log('🌐 Cache miss, loading from network...');
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
     * Fetch metadata JSON
     */
    private async fetchMetadata(url: string): Promise<ModelMetadata> {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Model metadata not found. Please retrain the model.');
            }
            throw new Error(`Failed to fetch metadata: HTTP ${response.status} ${response.statusText}`);
        }
        return await response.json();
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
     * Check if cached model needs update
     */
    async checkForUpdate(channelId: string): Promise<boolean> {
        if (!this.metadata) return true;

        try {
            const metadataUrl = `/assets/ml-models/${channelId}/latest/metadata.json`;
            const response = await fetch(metadataUrl);
            if (!response.ok) return false;

            const remoteMetadata: ModelMetadata = await response.json();
            const cachedTime = new Date(this.metadata.trainedAt);
            const remoteTime = new Date(remoteMetadata.trainedAt);

            return remoteTime > cachedTime;
        } catch (error) {
            console.error('Error checking for model update:', error);
            return false;
        }
    }
}

