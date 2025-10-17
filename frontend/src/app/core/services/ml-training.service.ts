import { Injectable, computed, inject, signal } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable, map, tap } from 'rxjs';
import { 
  GET_ML_TRAINING_INFO, 
  GET_ML_TRAINING_MANIFEST, 
  EXTRACT_PHOTOS_FOR_TRAINING, 
  UPDATE_TRAINING_STATUS, 
  COMPLETE_TRAINING 
} from '../graphql/operations.graphql';

export interface MlTrainingInfo {
    status: string;
    progress: number;
    startedAt?: string;
    error?: string;
    productCount: number;
    imageCount: number;
    hasActiveModel: boolean;
    lastTrainedAt?: string;
}

export interface MlTrainingManifest {
    channelId: string;
    version: string;
    extractedAt: string;
    products: ProductManifestEntry[];
}

export interface ProductManifestEntry {
    productId: string;
    productName: string;
    images: ImageManifestEntry[];
}

export interface ImageManifestEntry {
    assetId: string;
    url: string;
    filename: string;
}

// GraphQL operations are now imported from operations.graphql.ts

/**
 * ML Training Service
 * 
 * Angular service for managing ML model training workflow.
 * Provides reactive state management and GraphQL operations.
 */
@Injectable({
    providedIn: 'root'
})
export class MlTrainingService {
    private apollo = inject(Apollo);

    // Reactive state
    private trainingInfoSignal = signal<MlTrainingInfo | null>(null);
    private loadingSignal = signal(false);
    private errorSignal = signal<string | null>(null);

    // Computed values
    readonly trainingInfo = computed(() => this.trainingInfoSignal());
    readonly loading = computed(() => this.loadingSignal());
    readonly error = computed(() => this.errorSignal());

    // Status helpers
    readonly isIdle = computed(() => this.trainingInfo()?.status === 'idle');
    readonly isExtracting = computed(() => this.trainingInfo()?.status === 'extracting');
    readonly isReady = computed(() => this.trainingInfo()?.status === 'ready');
    readonly isTraining = computed(() => this.trainingInfo()?.status === 'training');
    readonly isActive = computed(() => this.trainingInfo()?.status === 'active');
    readonly isFailed = computed(() => this.trainingInfo()?.status === 'failed');

    // Status color helpers
    readonly statusColor = computed(() => {
        const status = this.trainingInfo()?.status;
        switch (status) {
            case 'idle': return 'gray';
            case 'extracting': return 'blue';
            case 'ready': return 'green';
            case 'training': return 'blue';
            case 'active': return 'success';
            case 'failed': return 'error';
            default: return 'gray';
        }
    });

    /**
     * Get training info for a channel
     */
    getTrainingInfo(channelId: string): Observable<MlTrainingInfo> {
        this.loadingSignal.set(true);
        this.errorSignal.set(null);

        return this.apollo.query<{ mlTrainingInfo: MlTrainingInfo }>({
            query: GET_ML_TRAINING_INFO,
            variables: { channelId },
            fetchPolicy: 'cache-and-network' as any,
            errorPolicy: 'all',
        }).pipe(
            map((result: any) => {
                if (result.errors && result.errors.length > 0) {
                    // Check if it's a schema error (GraphQL queries not available yet)
                    const schemaError = result.errors.some((err: any) =>
                        err.message.includes('Cannot query field') ||
                        err.message.includes('mlTrainingInfo')
                    );

                    if (schemaError) {
                        // Return default info when schema is not available
                        return {
                            status: 'idle',
                            progress: 0,
                            productCount: 0,
                            imageCount: 0,
                            hasActiveModel: false,
                        } as MlTrainingInfo;
                    }
                }
                return result.data.mlTrainingInfo;
            }),
            tap(info => {
                this.trainingInfoSignal.set(info);
                this.loadingSignal.set(false);
            }),
            tap({
                error: (error) => {
                    // If it's a GraphQL schema error, provide default info
                    if (error.message.includes('Cannot query field') ||
                        error.message.includes('mlTrainingInfo')) {
                        const defaultInfo: MlTrainingInfo = {
                            status: 'idle',
                            progress: 0,
                            productCount: 0,
                            imageCount: 0,
                            hasActiveModel: false,
                        };
                        this.trainingInfoSignal.set(defaultInfo);
                        this.loadingSignal.set(false);
                    } else {
                        this.errorSignal.set(error.message);
                        this.loadingSignal.set(false);
                    }
                }
            })
        );
    }

    /**
     * Get training manifest for a channel
     */
    getTrainingManifest(channelId: string): Observable<MlTrainingManifest> {
        return this.apollo.query<{ mlTrainingManifest: MlTrainingManifest }>({
            query: GET_ML_TRAINING_MANIFEST,
            variables: { channelId },
            errorPolicy: 'all',
        }).pipe(
            map((result: any) => {
                if (result.errors && result.errors.length > 0) {
                    const schemaError = result.errors.some((err: any) =>
                        err.message.includes('Cannot query field') ||
                        err.message.includes('mlTrainingManifest')
                    );
                    
                    if (schemaError) {
                        throw new Error('ML Training features not available. Please restart the backend to enable new schema.');
                    }
                }
                return result.data.mlTrainingManifest;
            })
        );
    }

    /**
     * Download training manifest as JSON file
     */
    async downloadManifest(channelId: string): Promise<void> {
        try {
            const manifest = await this.getTrainingManifest(channelId).toPromise();
            if (!manifest) throw new Error('Failed to get manifest');

            const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `training-manifest-${channelId}-${manifest.version}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
        } catch (error) {
            this.errorSignal.set(`Failed to download manifest: ${error}`);
        }
    }

    /**
     * Extract photos for training
     */
    extractPhotos(channelId: string): Observable<boolean> {
        this.loadingSignal.set(true);
        this.errorSignal.set(null);

        return this.apollo.mutate<{ extractPhotosForTraining: boolean }>({
            mutation: EXTRACT_PHOTOS_FOR_TRAINING,
            variables: { channelId },
            errorPolicy: 'all',
        }).pipe(
            map((result: any) => {
                if (result.errors && result.errors.length > 0) {
                    const schemaError = result.errors.some((err: any) =>
                        err.message.includes('Cannot query field') ||
                        err.message.includes('extractPhotosForTraining')
                    );
                    
                    if (schemaError) {
                        throw new Error('ML Training features not available. Please restart the backend to enable new schema.');
                    }
                }
                return result.data?.extractPhotosForTraining ?? false;
            }),
            tap(() => {
                this.loadingSignal.set(false);
                // Refresh training info after extraction
                this.getTrainingInfo(channelId).subscribe();
            }),
            tap({
                error: (error) => {
                    this.errorSignal.set(error.message);
                    this.loadingSignal.set(false);
                }
            })
        );
    }

    /**
     * Update training status (for external services)
     */
    updateTrainingStatus(
        channelId: string,
        status: string,
        progress?: number,
        error?: string
    ): Observable<boolean> {
        return this.apollo.mutate<{ updateTrainingStatus: boolean }>({
            mutation: UPDATE_TRAINING_STATUS,
            variables: { channelId, status, progress, error },
        }).pipe(
            map((result: any) => result.data?.updateTrainingStatus ?? false),
            tap(() => {
                // Refresh training info after status update
                this.getTrainingInfo(channelId).subscribe();
            })
        );
    }

    /**
     * Complete training with model files
     */
    completeTraining(
        channelId: string,
        modelJson: File,
        weightsFile: File,
        metadata: File
    ): Observable<boolean> {
        this.loadingSignal.set(true);
        this.errorSignal.set(null);

        return this.apollo.mutate<{ completeTraining: boolean }>({
            mutation: COMPLETE_TRAINING,
            variables: {
                channelId,
                modelJson,
                weightsFile,
                metadata,
            },
        }).pipe(
            map((result: any) => result.data?.completeTraining ?? false),
            tap(() => {
                this.loadingSignal.set(false);
                // Refresh training info after completion
                this.getTrainingInfo(channelId).subscribe();
            }),
            tap({
                error: (error) => {
                    this.errorSignal.set(error.message);
                    this.loadingSignal.set(false);
                }
            })
        );
    }

    /**
     * Clear error state
     */
    clearError(): void {
        this.errorSignal.set(null);
    }

    /**
     * Refresh training info
     */
    refresh(channelId: string): void {
        this.getTrainingInfo(channelId).subscribe();
    }

    /**
     * Get status display text
     */
    getStatusText(status: string): string {
        switch (status) {
            case 'idle': return 'Ready to extract photos';
            case 'extracting': return 'Extracting photos...';
            case 'ready': return 'Ready to train';
            case 'training': return 'Training in progress...';
            case 'active': return 'Model active';
            case 'failed': return 'Training failed';
            default: return 'Unknown status';
        }
    }

    /**
     * Check if status indicates training is in progress
     */
    isTrainingInProgress(): boolean {
        const status = this.trainingInfo()?.status;
        return status === 'extracting' || status === 'training';
    }

    /**
     * Check if ready for training
     */
    isReadyForTraining(): boolean {
        return this.isReady() || this.isActive();
    }
}
