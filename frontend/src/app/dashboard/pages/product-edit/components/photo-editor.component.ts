import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, effect, input, output, signal, viewChild } from '@angular/core';

/**
 * Product Asset Interface
 */
export interface ProductAsset {
    id: string;
    name: string;
    preview: string;
    source: string;
}

/**
 * Photo Editor Component
 * 
 * Allows editing of existing product photos with add/remove functionality.
 * Used in product edit mode after unlocking photo editing.
 */
@Component({
    selector: 'app-photo-editor',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        .aspect-square {
            aspect-ratio: 1;
        }

        .photo-thumbnail {
            transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .photo-thumbnail:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .photo-thumbnail:active {
            transform: scale(0.98);
        }

        /* Remove button animation */
        .btn-remove {
            transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .group:hover .btn-remove {
            transform: scale(1.1);
        }

        /* Add button animation */
        .btn-add {
            transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-add:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        .btn-add:active {
            transform: translateY(0);
        }
    `],
    template: `
        <!-- Hidden File Input -->
        <input
            #photoInput
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            (change)="onPhotosSelected($event)"
            class="hidden"
        />

        <!-- Photo Editor Container -->
        <div class="space-y-4">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="font-bold text-sm">Product Photos</h3>
                    <p class="text-xs opacity-70">Edit photos for AI recognition</p>
                </div>
                <button
                    type="button"
                    (click)="photoInput.click()"
                    class="btn btn-sm btn-primary gap-2 btn-add"
                >
                    <span>📸</span>
                    <span>Add Photos</span>
                </button>
            </div>

            <!-- Photos Grid -->
            @if (allPhotos().length === 0) {
                <!-- Empty State -->
                <div class="text-center py-8 bg-base-200 rounded-lg">
                    <div class="text-4xl mb-2">📷</div>
                    <p class="text-sm opacity-70">No photos yet</p>
                    <p class="text-xs opacity-50">Add photos for better AI recognition</p>
                </div>
            } @else {
                <!-- Photos Grid -->
                <div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    @for (photo of allPhotos(); track $index; let i = $index) {
                        <div class="relative aspect-square group">
                            <!-- Photo Thumbnail -->
                            <img
                                [src]="photo.preview"
                                [alt]="photo.name"
                                class="w-full h-full object-cover rounded-lg border border-base-300 photo-thumbnail"
                                loading="lazy"
                            />
                            
                            <!-- Remove Button -->
                            <button
                                type="button"
                                (click)="removePhoto(i)"
                                class="btn btn-circle btn-xs btn-error absolute -top-1 -right-1 shadow-lg btn-remove sm:opacity-0 sm:group-hover:opacity-100"
                                aria-label="Remove photo"
                            >
                                ✕
                            </button>
                            
                            <!-- Featured Badge -->
                            @if (i === 0) {
                                <div class="badge badge-xs badge-primary absolute bottom-1 left-1 gap-0.5">
                                    ⭐ Main
                                </div>
                            }

                            <!-- New Photo Badge -->
                            @if (isNewPhoto(i)) {
                                <div class="badge badge-xs badge-success absolute top-1 left-1">
                                    New
                                </div>
                            }
                        </div>
                    }
                </div>

                <!-- Help Text -->
                <div class="text-center">
                    <p class="text-xs opacity-60">
                        ⭐ First photo appears as main • 
                        <span class="text-success">Green badges</span> = New photos • 
                        <span class="text-error">Red X</span> = Remove
                    </p>
                </div>
            }

            <!-- Changes Summary -->
            @if (hasChanges()) {
                <div class="alert alert-info">
                    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div class="text-sm">
                        <strong>Changes detected:</strong> 
                        {{ newPhotos().length }} new, 
                        {{ removedPhotos().length }} removed
                    </div>
                </div>

                <!-- Save Changes Button -->
                <div class="flex justify-center mt-4">
                    <button 
                        type="button" 
                        (click)="emitChanges()" 
                        class="btn btn-primary gap-2"
                        [disabled]="isSaving()"
                    >
                        @if (isSaving()) {
                            <span class="loading loading-spinner loading-sm"></span>
                            <span>Saving...</span>
                        } @else {
                            <span>💾</span>
                            <span>Save Photo Changes</span>
                        }
                    </button>
                </div>
            }
        </div>
    `,
})
export class PhotoEditorComponent implements OnInit {
    // Inputs
    readonly existingAssets = input<ProductAsset[]>([]);

    // State
    readonly newPhotos = signal<File[]>([]);
    readonly newPhotoPreviews = signal<string[]>([]);
    readonly removedPhotos = signal<string[]>([]); // IDs of removed assets
    readonly isSaving = signal(false);

    // View reference
    readonly photoInput = viewChild<ElementRef<HTMLInputElement>>('photoInput');

    // Outputs
    readonly photosChanged = output<{
        newPhotos: File[];
        removedAssetIds: string[];
    }>();

    // Computed: All photos (existing + new)
    readonly allPhotos = signal<ProductAsset[]>([]);

    // Computed: Check if there are changes
    readonly hasChanges = signal(false);

    constructor() {
        // Watch for changes in existingAssets input
        effect(() => {
            const assets = this.existingAssets();
            this.updateAllPhotos();
        });
    }

    ngOnInit(): void {
        // Initial update
        this.updateAllPhotos();
    }

    /**
     * Handle photo selection from input
     */
    onPhotosSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const newFiles = Array.from(input.files);
        const currentNewPhotos = this.newPhotos();

        // Add new photos
        const allNewPhotos = [...currentNewPhotos, ...newFiles];
        this.newPhotos.set(allNewPhotos);

        // Generate previews for new photos
        newFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = e.target?.result as string;
                this.newPhotoPreviews.set([...this.newPhotoPreviews(), preview]);
            };
            reader.readAsDataURL(file);
        });

        // Update all photos
        this.updateAllPhotos();

        // Clear input
        input.value = '';
    }

    /**
     * Remove a photo at specific index
     */
    removePhoto(index: number): void {
        const existingAssets = this.existingAssets();
        const newPhotos = this.newPhotos();
        const newPhotoPreviews = this.newPhotoPreviews();

        if (index < existingAssets.length) {
            // Removing an existing asset
            const asset = existingAssets[index];
            this.removedPhotos.set([...this.removedPhotos(), asset.id]);
        } else {
            // Removing a new photo
            const newIndex = index - existingAssets.length;
            newPhotos.splice(newIndex, 1);
            newPhotoPreviews.splice(newIndex, 1);
            this.newPhotos.set([...newPhotos]);
            this.newPhotoPreviews.set([...newPhotoPreviews]);
        }

        // Update all photos
        this.updateAllPhotos();
    }

    /**
     * Check if a photo is new (not from existing assets)
     */
    isNewPhoto(index: number): boolean {
        const existingAssets = this.existingAssets();
        return index >= existingAssets.length;
    }

    /**
     * Update the allPhotos signal
     */
    private updateAllPhotos(): void {
        const existingAssets = this.existingAssets();
        const newPhotos = this.newPhotos();
        const newPhotoPreviews = this.newPhotoPreviews();
        const removedPhotos = this.removedPhotos();

        // Filter out removed existing assets
        const filteredExisting = existingAssets.filter(asset =>
            !removedPhotos.includes(asset.id)
        );

        // Create mock assets for new photos
        const newPhotoAssets: ProductAsset[] = newPhotoPreviews.map((preview, index) => ({
            id: `new-${index}`,
            name: newPhotos[index]?.name || `New Photo ${index + 1}`,
            preview,
            source: preview
        }));

        // Combine existing and new photos
        const allPhotos = [...filteredExisting, ...newPhotoAssets];
        this.allPhotos.set(allPhotos);

        // Update hasChanges
        this.hasChanges.set(
            newPhotos.length > 0 || removedPhotos.length > 0
        );
    }

    /**
     * Emit changes to parent (only when explicitly called)
     */
    emitChanges(): void {
        this.isSaving.set(true);
        this.photosChanged.emit({
            newPhotos: this.newPhotos(),
            removedAssetIds: this.removedPhotos()
        });
    }

    /**
     * Reset saving state (called by parent after processing)
     */
    resetSavingState(): void {
        this.isSaving.set(false);
    }

    /**
     * Get current changes summary
     */
    getChangesSummary(): { new: number; removed: number } {
        return {
            new: this.newPhotos().length,
            removed: this.removedPhotos().length
        };
    }

    /**
     * Clear all changes
     */
    clearChanges(): void {
        this.newPhotos.set([]);
        this.newPhotoPreviews.set([]);
        this.removedPhotos.set([]);
        this.updateAllPhotos();
        this.emitChanges();
    }
}
