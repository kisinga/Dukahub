import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService, NotificationService } from '@vendure/admin-ui/core';

@Component({
    selector: 'ml-model-admin',
    template: `
        <div class="flex flex-col h-full">
            <div class="flex items-center justify-between p-4 border-b">
                <h1 class="text-2xl font-semibold">ML Model Management</h1>
                <div class="flex items-center gap-2">
                    <vdr-chip *ngIf="currentChannel" [colorType]="currentChannel.mlModelInfo?.status === 'active' ? 'success' : 'warning'">
                        {{ currentChannel.mlModelInfo?.status || 'inactive' }}
                    </vdr-chip>
                </div>
            </div>

            <div class="flex-1 p-4 overflow-auto">
                <!-- Current Channel Info -->
                <div class="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h2 class="text-lg font-medium mb-2">Channel: {{ currentChannel?.name }}</h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span class="font-medium">Status:</span>
                            <span class="ml-2">{{ currentChannel?.mlModelInfo?.status || 'No model' }}</span>
                        </div>
                        <div>
                            <span class="font-medium">Version:</span>
                            <span class="ml-2">{{ currentChannel?.mlModelInfo?.version || 'N/A' }}</span>
                        </div>
                        <div>
                            <span class="font-medium">Products:</span>
                            <span class="ml-2">{{ currentChannel?.mlModelInfo?.productCount || 0 }}</span>
                        </div>
                        <div>
                            <span class="font-medium">Images:</span>
                            <span class="ml-2">{{ currentChannel?.mlModelInfo?.imageCount || 0 }}</span>
                        </div>
                    </div>
                </div>

                <!-- Upload Form -->
                <div class="mb-6 p-4 border rounded-lg">
                    <h3 class="text-lg font-medium mb-4">Upload ML Model Files</h3>

                    <form [formGroup]="uploadForm" (ngSubmit)="onUpload()">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <!-- Model JSON File -->
                            <div>
                                <label class="block text-sm font-medium mb-2">Model JSON File *</label>
                                <input
                                    type="file"
                                    accept=".json"
                                    formControlName="modelJson"
                                    class="w-full p-2 border rounded"
                                    (change)="onFileSelected($event, 'modelJson')"
                                />
                                <div *ngIf="uploadForm.get('modelJson')?.invalid && uploadForm.get('modelJson')?.touched"
                                     class="text-red-500 text-sm mt-1">
                                    Model JSON file is required
                                </div>
                            </div>

                            <!-- Metadata File -->
                            <div>
                                <label class="block text-sm font-medium mb-2">Metadata File *</label>
                                <input
                                    type="file"
                                    accept=".json"
                                    formControlName="metadata"
                                    class="w-full p-2 border rounded"
                                    (change)="onFileSelected($event, 'metadata')"
                                />
                                <div *ngIf="uploadForm.get('metadata')?.invalid && uploadForm.get('metadata')?.touched"
                                     class="text-red-500 text-sm mt-1">
                                    Metadata file is required
                                </div>
                            </div>
                        </div>

                        <!-- Submit Button -->
                        <div class="flex gap-2">
                            <button
                                type="submit"
                                [disabled]="uploadForm.invalid || isUploading"
                                class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed">
                                <span *ngIf="!isUploading">Upload Model</span>
                                <span *ngIf="isUploading">Uploading...</span>
                            </button>

                            <button
                                type="button"
                                *ngIf="currentChannel?.mlModelInfo?.hasModel"
                                (click)="onDelete()"
                                [disabled]="isDeleting"
                                class="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed">
                                <span *ngIf="!isDeleting">Delete Model</span>
                                <span *ngIf="isDeleting">Deleting...</span>
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Model Files -->
                <div *ngIf="currentChannel?.mlModelFiles?.length > 0" class="mb-6">
                    <h3 class="text-lg font-medium mb-4">Uploaded Files</h3>
                    <div class="space-y-2">
                        <div *ngFor="let file of currentChannel.mlModelFiles"
                             class="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div class="flex items-center gap-3">
                                <vdr-chip [colorType]="'info'">{{ file.filename }}</vdr-chip>
                                <span class="text-sm text-gray-600">{{ (file.size / 1024) | number:'1.0-1' }} KB</span>
                                <span class="text-sm text-gray-500">{{ file.uploadedAt | date:'short' }}</span>
                            </div>
                            <div class="flex gap-2">
                                <button
                                    (click)="downloadFile(file)"
                                    class="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700">
                                    Download
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Training Labels -->
                <div *ngIf="currentChannel?.mlModelInfo?.labels?.length > 0" class="mb-6">
                    <h3 class="text-lg font-medium mb-4">Training Labels</h3>
                    <div class="flex flex-wrap gap-2">
                        <vdr-chip *ngFor="let label of currentChannel.mlModelInfo.labels" [colorType]="'primary'">
                            {{ label }}
                        </vdr-chip>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host {
            display: block;
            height: 100%;
        }
    `]
})
export class MlModelAdminComponent implements OnInit {
    currentChannel: any = null;
    uploadForm: FormGroup;
    isUploading = false;
    isDeleting = false;

    constructor(
        private dataService: DataService,
        private notificationService: NotificationService,
        private fb: FormBuilder
    ) {
        this.uploadForm = this.fb.group({
            modelJson: ['', Validators.required],
            metadata: ['', Validators.required],
        });
    }

    ngOnInit() {
        this.loadChannelData();
    }

    private async loadChannelData() {
        try {
            // Get current channel info with ML model data
            const result = await this.dataService
                .query(gql`
                    query GetChannelWithMlModel {
                        activeChannel {
                            id
                            name
                            mlModelInfo {
                                hasModel
                                version
                                status
                                trainedAt
                                productCount
                                imageCount
                                labels
                            }
                            mlModelFiles {
                                filename
                                url
                                size
                                uploadedAt
                            }
                        }
                    }
                `)
                .single$.toPromise();

            this.currentChannel = result?.activeChannel;
        } catch (error) {
            console.error('Error loading channel data:', error);
            this.notificationService.error('Failed to load channel data');
        }
    }

    onFileSelected(event: any, controlName: string) {
        const file = event.target.files[0];
        if (file) {
            this.uploadForm.patchValue({
                [controlName]: file
            });
        }
    }

    async onUpload() {
        if (this.uploadForm.invalid) {
            return;
        }

        this.isUploading = true;

        try {
            const formData = new FormData();
            formData.append('modelJson', this.uploadForm.get('modelJson')?.value);
            formData.append('metadata', this.uploadForm.get('metadata')?.value);

            await this.dataService
                .mutate(gql`
                    mutation UploadMlModelFiles($channelId: ID!, $modelJson: Upload!, $metadata: Upload!) {
                        uploadMlModelFiles(
                            channelId: $channelId
                            modelJson: $modelJson
                            metadata: $metadata
                        )
                    }
                `, {
                    channelId: this.currentChannel.id,
                    modelJson: this.uploadForm.get('modelJson')?.value,
                    metadata: this.uploadForm.get('metadata')?.value,
                })
                .toPromise();

            this.notificationService.success('ML model uploaded successfully');
            await this.loadChannelData(); // Refresh data

        } catch (error) {
            console.error('Upload error:', error);
            this.notificationService.error('Failed to upload ML model');
        } finally {
            this.isUploading = false;
        }
    }

    async onDelete() {
        if (!confirm('Are you sure you want to delete the ML model? This action cannot be undone.')) {
            return;
        }

        this.isDeleting = true;

        try {
            await this.dataService
                .mutate(gql`
                    mutation DeleteMlModel($channelId: ID!) {
                        deleteMlModel(channelId: $channelId)
                    }
                `, {
                    channelId: this.currentChannel.id,
                })
                .toPromise();

            this.notificationService.success('ML model deleted successfully');
            await this.loadChannelData(); // Refresh data

        } catch (error) {
            console.error('Delete error:', error);
            this.notificationService.error('Failed to delete ML model');
        } finally {
            this.isDeleting = false;
        }
    }

    downloadFile(file: any) {
        // For now, just open in new tab (you might want to implement proper download)
        window.open(file.url, '_blank');
    }
}

