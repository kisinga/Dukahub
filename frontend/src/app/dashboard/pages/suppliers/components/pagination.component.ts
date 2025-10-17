import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-pagination',
    imports: [CommonModule],
    templateUrl: './pagination.component.html',
    styleUrl: './pagination.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaginationComponent {
    @Input({ required: true }) currentPage!: number;
    @Input({ required: true }) totalPages!: number;
    @Input({ required: true }) itemsPerPage!: number;
    @Input({ required: true }) pageOptions!: number[];
    @Input({ required: true }) endItem!: number;
    @Input({ required: true }) totalItems!: number;

    @Output() pageChange = new EventEmitter<number>();
    @Output() itemsPerPageChange = new EventEmitter<number>();

    onPageChange(page: number): void {
        this.pageChange.emit(page);
    }

    onItemsPerPageChange(items: number): void {
        this.itemsPerPageChange.emit(items);
    }

    getStartItem(): number {
        return (this.currentPage - 1) * this.itemsPerPage + 1;
    }

    getPageNumbers(): number[] {
        const pages: number[] = [];
        const maxVisible = 5;
        const start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        const end = Math.min(this.totalPages, start + maxVisible - 1);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    }
}
