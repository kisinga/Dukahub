import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TruncatePipe } from "../../../pipes/truncate.pipe";

interface TableColumn {
  key: string;
  label: string;
  safeLabel?: SafeHtml;
  type: 'text' | 'number' | 'image' | 'editable';
}

interface TableRow {
  id: string;
  [key: string]: any;
}

@Component({
  selector: 'app-generic-table',
  standalone: true,
  imports: [CommonModule, FormsModule, TruncatePipe],
  templateUrl: './generic-table.component.html',
  styles: []
})
export class GenericTableComponent {
  @Input() set columns(value: TableColumn[]) {
    this._columns = value.map(col => ({
      ...col,
      safeLabel: this.sanitizer.bypassSecurityTrustHtml(col.label)
    }));
  }
  get columns(): TableColumn[] {
    return this._columns;
  }
  private _columns: TableColumn[] = [];
  editingCell: { rowId: string | null, key: string | null } = { rowId: null, key: null };

  @Input() data: TableRow[] = [];
  @Input() itemsPerPage = 10;
  @Output() save = new EventEmitter<TableRow[]>();

  constructor(private sanitizer: DomSanitizer) { }

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


  startEditing(rowId: string, key: string): void {
    this.editingCell = { rowId, key };
    setTimeout(() => {
      const input = document.querySelector('input:focus') as HTMLInputElement;
      if (input) {
        input.select();
      }
    }, 0);
  }

  stopEditing(): void {
    const { rowId, key } = this.editingCell;
    if (rowId !== null && key !== null) {
      this.onFieldUpdate(rowId, key, this.data.find(row => row.id === rowId)?.[key]);
    }
    this.editingCell = { rowId: null, key: null };
  }

  isEditing(rowId: string, key: string): boolean {
    return this.editingCell.rowId === rowId && this.editingCell.key === key;
  }

  onFieldUpdate(id: string, key: string, value: any): void {
    const index = this.data.findIndex(item => item.id === id);
    if (index !== -1) {
      this.data[index] = { ...this.data[index], [key]: value };
    }
  }

  onSave(): void {
    this.save.emit(this.data);
  }
}

