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
    template: `
        <div class="card card-border bg-base-100">
            <div class="card-body">
                <h2 class="card-title">Product Photos</h2>
                <p class="text-sm text-base-content/70 mb-2">
                    📸 Important for AI recognition (pricing posters, symbols, product packaging)
                </p>

                <!-- Photo Upload Button -->
                <div class="flex items-center gap-3 mb-4">
                    <input
                        #photoInput
                        type="file"
                        accept="image/*"
                        multiple
                        capture="environment"
                        (change)="onPhotosSelected($event)"
                        class="hidden"
                    />

                    <button
                        type="button"
                        (click)="photoInput.click()"
                        class="btn btn-primary"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                            />
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                        Take Photo / Choose from Gallery
                    </button>

                    <div class="badge badge-lg" [class.badge-success]="photos().length > 0">
                        {{ photos().length }} photo(s)
                    </div>
                </div>

                <!-- Photo Previews Grid -->
                @if (photoPreviews().length > 0) {
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        @for (preview of photoPreviews(); track $index; let i = $index) {
                            <div class="relative group">
                                <img
                                    [src]="preview"
                                    [alt]="'Product photo ' + (i + 1)"
                                    class="w-full h-32 object-cover rounded-lg border-2 border-base-300"
                                />
                                <button
                                    type="button"
                                    (click)="removePhoto(i)"
                                    class="btn btn-circle btn-sm btn-error absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        class="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                                @if (i === 0) {
                                    <div class="badge badge-primary badge-sm absolute bottom-1 left-1">
                                        Featured
                                    </div>
                                }
                            </div>
                        }
                    </div>
                }
            </div>
        </div>
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

