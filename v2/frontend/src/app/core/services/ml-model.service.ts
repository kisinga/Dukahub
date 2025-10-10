import { Injectable, signal } from '@angular/core';
import * as tmImage from '@teachablemachine/image';
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
 * Service for managing ML model loading, caching, and inference
 * Follows the ML_MODEL_GUIDE.md specifications
 */
@Injectable({
    providedIn: 'root',
})
export class MlModelService {
    private model: tmImage.CustomMobileNet | null = null;
    private metadata: ModelMetadata | null = null;
    private readonly isLoadingSignal = signal<boolean>(false);
    private readonly isInitializedSignal = signal<boolean>(false);
    private readonly errorSignal = signal<string | null>(null);

    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly isInitialized = this.isInitializedSignal.asReadonly();
    readonly error = this.errorSignal.asReadonly();

    /**
     * Check if model exists for the given channel
     */
    async checkModelExists(channelId: string): Promise<boolean> {
        try {
            const metadataUrl = `/assets/ml-models/${channelId}/latest/metadata.json`;
            const response = await fetch(metadataUrl, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            console.error('Error checking model existence:', error);
            return false;
        }
    }

    /**
     * Load model for the given channel
     * Downloads and caches model files from backend
     */
    async loadModel(channelId: string): Promise<boolean> {
        if (this.model) {
            console.log('Model already loaded');
            return true;
        }

        this.isLoadingSignal.set(true);
        this.errorSignal.set(null);

        try {
            // Set TensorFlow backend
            await tf.setBackend('webgl');
            await tf.ready();
            console.log(`TensorFlow.js backend ready: ${tf.getBackend()}`);

            const baseUrl = `/assets/ml-models/${channelId}/latest/`;

            // Download all model files in parallel
            console.log('Downloading model files...');
            const [modelJson, weights, metadataJson] = await Promise.all([
                this.fetchAsFile(`${baseUrl}model.json`, 'model.json', 'application/json'),
                this.fetchAsFile(`${baseUrl}weights.bin`, 'weights.bin', 'application/octet-stream'),
                this.fetchMetadata(`${baseUrl}metadata.json`),
            ]);

            // Store metadata
            this.metadata = metadataJson;

            // Load model using Teachable Machine
            console.log('Loading model into TensorFlow.js...');
            this.model = await tmImage.loadFromFiles(modelJson, weights, metadataJson as any);

            this.isInitializedSignal.set(true);
            console.log('Model loaded successfully:', {
                productCount: this.metadata.productCount,
                imageCount: this.metadata.imageCount,
                labels: this.metadata.labels.length,
            });

            return true;
        } catch (error: any) {
            console.error('Failed to load model:', error);
            this.errorSignal.set(error.message || 'Failed to load model');
            this.model = null;
            this.metadata = null;
            this.isInitializedSignal.set(false);
            return false;
        } finally {
            this.isLoadingSignal.set(false);
        }
    }

    /**
     * Fetch URL as File object
     */
    private async fetchAsFile(url: string, filename: string, type: string): Promise<File> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${filename}: ${response.status}`);
        }
        const blob = await response.blob();
        return new File([blob], filename, { type });
    }

    /**
     * Fetch metadata JSON
     */
    private async fetchMetadata(url: string): Promise<ModelMetadata> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch metadata: ${response.status}`);
        }
        return await response.json();
    }

    /**
     * Run prediction on image or video element
     * Returns top K predictions sorted by probability
     */
    async predict(
        imageElement: HTMLImageElement | HTMLVideoElement,
        topK: number = 3
    ): Promise<ModelPrediction[]> {
        if (!this.model) {
            throw new Error('Model not loaded. Call loadModel() first.');
        }

        try {
            const predictions = await this.model.predictTopK(imageElement, topK);
            return predictions.map((p) => ({
                className: p.className,
                probability: p.probability,
            }));
        } catch (error) {
            console.error('Prediction error:', error);
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
     * Unload model to free memory
     */
    unloadModel(): void {
        if (this.model) {
            // Dispose TensorFlow tensors
            this.model.dispose();
            this.model = null;
            this.metadata = null;
            this.isInitializedSignal.set(false);
            console.log('Model unloaded');
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

