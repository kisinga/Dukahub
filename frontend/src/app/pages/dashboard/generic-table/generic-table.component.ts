import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
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

  @Input() data: TableRow[] = [];
  @Input() itemsPerPage = 10;
  @Output() save = new EventEmitter<TableRow[]>();

  constructor(private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef

  ) { }

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

  onInputChange(event: Event, id: string, key: string): void {
    const value = (event.target as HTMLInputElement).value;

    // Update the data immediately
    const index = this.data.findIndex(item => item.id === id);
    if (index !== -1) {
      this.data[index] = { ...this.data[index], [key]: value };
    }

    // Call onFieldUpdate to ensure consistency with existing logic
    this.onFieldUpdate(id, key, value);

    // Trigger change detection
    this.cdr.detectChanges();
  }

  onFieldUpdate(id: string, key: string, value: any): void {
    const index = this.data.findIndex(item => item.id === id);
    if (index !== -1) {
      this.data[index] = { ...this.data[index], [key]: value };
    }
    // If you have any additional logic or API calls, you can keep them here
  }
  onSave(): void {
    this.save.emit(this.data);
  }
}

