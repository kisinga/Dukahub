import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, output, signal, viewChild } from '@angular/core';

/**
 * Photo Manager Component
 * 
 * Handles product photo upload, preview, and removal.
 * Important for AI-powered product recognition.
 */
@Component({
    selector: 'app-photo-manager',
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

        /* Empty state button hover */
        .btn-upload-empty {
            transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-upload-empty:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        .btn-upload-empty:active {
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

        <!-- Upload Button (Empty State) -->
        @if (photoPreviews().length === 0) {
            <button
                type="button"
                (click)="photoInput.click()"
                class="btn btn-outline btn-block gap-2 h-auto py-6 flex-col btn-upload-empty"
            >
                <span class="text-4xl">📸</span>
                <div class="flex items-center gap-2">
                    <span class="font-semibold">Add Photos</span>
                    <div 
                        class="tooltip tooltip-right" 
                        data-tip="Take photos of product, price tags, or packaging for AI recognition"
                    >
                        <span class="badge badge-xs badge-ghost">?</span>
                    </div>
                </div>
                <span class="text-xs opacity-60">📱 Camera or 🖼️ Gallery</span>
            </button>
        } @else {
            <!-- Photo Grid -->
            <div class="space-y-2">
                <!-- Add More Button with Count -->
                <button
                    type="button"
                    (click)="photoInput.click()"
                    class="btn btn-sm btn-outline btn-block gap-1"
                >
                    <span>➕</span>
                    <span>Add More</span>
                    <span class="badge badge-sm" [class.badge-primary]="photos().length > 0">
                        {{ photos().length }}
                    </span>
                </button>

                <!-- Photo Thumbnails Grid -->
                <div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                    @for (preview of photoPreviews(); track $index; let i = $index) {
                        <div class="relative aspect-square group">
                            <!-- Photo Thumbnail -->
                            <img
                                [src]="preview"
                                [alt]="'Photo ' + (i + 1)"
                                class="w-full h-full object-cover rounded-lg border border-base-300 photo-thumbnail"
                                loading="lazy"
                            />
                            
                            <!-- Remove Button (Always visible on mobile, hover on desktop) -->
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
                        </div>
                    }
                </div>

                <!-- Helpful Hint -->
                <div class="text-center">
                    <p class="text-xs opacity-60">⭐ First photo appears as main</p>
                </div>
            </div>
        }
    `,
})
export class PhotoManagerComponent {
    // State
    readonly photos = signal<File[]>([]);
    readonly photoPreviews = signal<string[]>([]);

    // View reference
    readonly photoInput = viewChild<ElementRef<HTMLInputElement>>('photoInput');

    // Output
    readonly photosChanged = output<File[]>();

    /**
     * Handle photo selection from input
     */
    onPhotosSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const newFiles = Array.from(input.files);
        const currentPhotos = this.photos();

        // Add new photos
        const allPhotos = [...currentPhotos, ...newFiles];
        this.photos.set(allPhotos);

        // Generate previews for new photos
        newFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = e.target?.result as string;
                this.photoPreviews.set([...this.photoPreviews(), preview]);
            };
            reader.readAsDataURL(file);
        });

        // Emit change
        this.photosChanged.emit(allPhotos);

        // Clear input
        input.value = '';
    }

    /**
     * Remove a photo at specific index
     */
    removePhoto(index: number): void {
        const photos = this.photos();
        const previews = this.photoPreviews();

        photos.splice(index, 1);
        previews.splice(index, 1);

        this.photos.set([...photos]);
        this.photoPreviews.set([...previews]);

        // Emit change
        this.photosChanged.emit([...photos]);
    }

    /**
     * Get current photos (for parent component)
     */
    getPhotos(): File[] {
        return this.photos();
    }

    /**
     * Clear all photos (for reset)
     */
    clearPhotos(): void {
        this.photos.set([]);
        this.photoPreviews.set([]);
        this.photosChanged.emit([]);
    }
}

