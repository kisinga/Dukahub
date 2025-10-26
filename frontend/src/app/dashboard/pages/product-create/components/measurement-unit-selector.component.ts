import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Measurement Unit Selector Component
 * 
 * Handles unit selection for measured products.
 * Only visible when product type is 'measured'.
 */
@Component({
    selector: 'app-measurement-unit-selector',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (visible()) {
            <div class="card bg-base-100 shadow">
                <div class="card-body p-3">
                    <h3 class="font-bold text-sm">Measurement Unit</h3>
                    <select
                        class="select select-bordered w-full mt-2"
                        [value]="measurementUnit()"
                        (change)="onUnitChange($any($event.target).value)"
                    >
                        <option value="">Select unit...</option>
                        <optgroup label="Weight">
                            <option value="KG">Kilograms (kg)</option>
                            <option value="G">Grams (g)</option>
                            <option value="LB">Pounds (lb)</option>
                        </optgroup>
                        <optgroup label="Volume">
                            <option value="L">Liters (L)</option>
                            <option value="ML">Milliliters (mL)</option>
                            <option value="GAL">Gallons (gal)</option>
                        </optgroup>
                        <optgroup label="Length">
                            <option value="M">Meters (m)</option>
                            <option value="CM">Centimeters (cm)</option>
                            <option value="FT">Feet (ft)</option>
                        </optgroup>
                        <optgroup label="Area">
                            <option value="M2">Square Meters (m²)</option>
                        </optgroup>
                    </select>

                    <div class="bg-info/10 p-2 rounded text-xs mt-2">
                        ✅ Fractional sales enabled - customers can buy any amount
                    </div>
                </div>
            </div>
        }
    `,
})
export class MeasurementUnitSelectorComponent {
    // Inputs
    readonly measurementUnit = input<string | null>(null);
    readonly visible = input<boolean>(false);

    // Outputs
    readonly unitChange = output<string>();

    /**
     * Handle unit selection change
     */
    onUnitChange(unit: string): void {
        this.unitChange.emit(unit);
    }
}

