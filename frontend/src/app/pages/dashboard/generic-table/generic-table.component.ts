import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface TableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'image' | 'editable';
}

interface TableRow {
  id: number;
  [key: string]: any;
}

@Component({
  selector: 'app-generic-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './generic-table.component.html',
  styles: []
})
export class GenericTableComponent {
  @Input() columns: TableColumn[] = [];
  @Input() data: TableRow[] = [];
  @Input() itemsPerPage = 10;
  @Output() save = new EventEmitter<TableRow[]>();

  currentPage = 1;

  get paginatedData(): TableRow[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.data.slice(start, start + this.itemsPerPage);
  }

  getPages(): number[] {
    const pageCount = Math.ceil(this.data.length / this.itemsPerPage);
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  setPage(page: number): void {
    this.currentPage = page;
  }

  onFieldUpdate(id: number, key: string, value: any): void {
    const index = this.data.findIndex(item => item.id === id);
    if (index !== -1) {
      this.data[index] = { ...this.data[index], [key]: value };
    }
  }

  onSave(): void {
    this.save.emit(this.data);
  }
}