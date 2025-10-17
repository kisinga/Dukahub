import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    computed,
    inject,
    signal,
} from '@angular/core';
import {
    FormArray,
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';

/**
 * Product Edit Component
 * 
 * Focused on editing product metadata (name, SKU names, prices)
 * Stock is read-only - use inventory module for stock adjustments
 * Reuses form components but with edit-specific validation and flow
 */
@Component({
    selector: 'app-product-edit',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './product-edit.component.html',
    styleUrl: './product-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductEditComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly productService = inject(ProductService);

    // Product ID from route
    readonly productId = signal<string | null>(null);
    readonly isLoading = signal(false);

    // Form
    readonly productForm: FormGroup;

    // Submission state
    readonly isSubmitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly submitSuccess = signal(false);

    // Computed: SKUs FormArray
    get skus(): FormArray {
        return this.productForm.get('skus') as FormArray;
    }

    // Computed: Form validity
    readonly canSubmit = computed(() => {
        return this.productForm.valid && !this.isSubmitting();
    });

    // Computed: Validation issues
    readonly validationIssues = computed(() => {
        const issues: string[] = [];

        if (!this.productForm.get('name')?.valid) {
            issues.push('Product name required');
        }

        if (this.skus.length === 0) {
            issues.push('At least 1 SKU required');
        } else {
            const invalidSkus = this.skus.controls.filter(sku => {
                return sku.get('name')?.invalid || sku.get('price')?.invalid;
            }).length;

            if (invalidSkus > 0) {
                issues.push(`${invalidSkus} SKU(s) have errors`);
            }
        }

        return issues;
    });

    constructor() {
        // Initialize form
        this.productForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            skus: this.fb.array([]),
        });
    }

    async ngOnInit(): Promise<void> {
        const productId = this.route.snapshot.paramMap.get('id');
        if (!productId) {
            this.submitError.set('No product ID provided');
            return;
        }

        this.productId.set(productId);
        await this.loadProduct(productId);
    }

    /**
     * Load product data
     */
    private async loadProduct(productId: string): Promise<void> {
        this.isLoading.set(true);
        try {
            const product = await this.productService.getProductById(productId);
            if (!product) {
                this.submitError.set('Product not found');
                return;
            }

            // Populate form
            this.productForm.patchValue({
                name: product.name,
            });

            // Load variants as SKUs
            if (product.variants && product.variants.length > 0) {
                product.variants.forEach((variant: any) => {
                    // Convert price from cents to decimal
                    const priceDecimal = variant.priceWithTax / 100;

                    const skuGroup = this.fb.group({
                        id: [variant.id], // Store variant ID for updates
                        name: [variant.name, [Validators.required, Validators.minLength(1)]],
                        sku: [variant.sku], // Read-only, stored for display
                        price: [priceDecimal, [Validators.required, Validators.min(0.01)]],
                        stockOnHand: [variant.stockOnHand || 0], // Read-only
                    });

                    this.skus.push(skuGroup);
                });
            }
        } catch (error: any) {
            console.error('Failed to load product:', error);
            this.submitError.set('Failed to load product data');
        } finally {
            this.isLoading.set(false);
        }
    }

    /**
     * Add a new SKU
     */
    addSku(): void {
        const skuGroup = this.fb.group({
            id: [null], // No ID = new SKU
            name: ['', [Validators.required, Validators.minLength(1)]],
            sku: ['AUTO'], // Auto-generated
            price: [0, [Validators.required, Validators.min(0.01)]],
            stockOnHand: [0], // Locked to 0 for new SKUs
        });

        this.skus.push(skuGroup);
    }

    /**
     * Remove SKU at index
     */
    removeSku(index: number): void {
        if (this.skus.length > 1) {
            const sku = this.skus.at(index);
            const skuId = sku.get('id')?.value;

            if (skuId) {
                // TODO: Mark for deletion or handle variant deletion
                // For now, just remove from form
                console.warn('Deleting existing SKU:', skuId);
            }

            this.skus.removeAt(index);
        }
    }

    /**
     * Submit form - updates product and variants
     */
    async onSubmit(): Promise<void> {
        if (!this.canSubmit()) {
            this.productForm.markAllAsTouched();
            this.markFormArrayTouched(this.skus);
            return;
        }

        this.isSubmitting.set(true);
        this.submitError.set(null);
        this.submitSuccess.set(false);

        try {
            const formValue = this.productForm.value;
            const productId = this.productId();

            if (!productId) {
                this.submitError.set('Product ID missing');
                return;
            }

            // Update product name
            const productInput = {
                id: productId,
                name: formValue.name.trim(),
            };

            // Update variants
            const variantUpdates = formValue.skus.map((sku: any) => {
                // Convert decimal price to cents
                const priceInCents = Math.round(Number(sku.price) * 100);

                return {
                    id: sku.id,
                    name: sku.name.trim(),
                    price: priceInCents, // Price in cents, inc tax
                    // Stock is NOT updated here - use inventory module
                };
            });

            // TODO: Call product service update method
            // For now, log the update
            console.log('Update product:', productInput);
            console.log('Update variants:', variantUpdates);

            // Temporary success
            this.submitSuccess.set(true);

            setTimeout(() => {
                this.router.navigate(['/dashboard/products']);
            }, 1500);

        } catch (error: any) {
            console.error('Product update failed:', error);
            this.submitError.set(error.message || 'An unexpected error occurred');
        } finally {
            this.isSubmitting.set(false);
        }
    }

    /**
     * Cancel and go back
     */
    cancel(): void {
        this.router.navigate(['/dashboard/products']);
    }

    /**
     * Mark all controls in a FormArray as touched
     */
    private markFormArrayTouched(formArray: FormArray): void {
        formArray.controls.forEach(control => {
            if (control instanceof FormGroup) {
                Object.keys(control.controls).forEach(key => {
                    control.get(key)?.markAsTouched();
                });
            } else {
                control.markAsTouched();
            }
        });
    }

    /**
     * Check if a SKU field has an error
     */
    skuFieldHasError(skuIndex: number, fieldName: string): boolean {
        const control = this.skus.at(skuIndex)?.get(fieldName);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    /**
     * Get error message for a SKU field
     */
    getSkuFieldError(skuIndex: number, fieldName: string): string {
        const control = this.skus.at(skuIndex)?.get(fieldName);
        if (!control?.errors) return '';

        const errors = control.errors;
        if (errors['required']) return 'Required';
        if (errors['minlength']) return `Min ${errors['minlength'].requiredLength} chars`;
        if (errors['min']) return `Min value: ${errors['min'].min}`;

        return 'Invalid';
    }
}

