import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface SupplierStats {
    totalSuppliers: number;
    verifiedSuppliers: number;
    suppliersWithAddresses: number;
    recentSuppliers: number;
}

@Component({
    selector: 'app-supplier-stats',
    imports: [CommonModule],
    templateUrl: './supplier-stats.component.html',
    styleUrl: './supplier-stats.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierStatsComponent {
    @Input({ required: true }) stats!: SupplierStats;
}
