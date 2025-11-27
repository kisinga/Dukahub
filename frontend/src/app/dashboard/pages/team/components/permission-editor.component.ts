import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
  viewChild,
} from '@angular/core';
import { TeamService, type Administrator, type RoleTemplate } from '../../../../core/services/team.service';

/**
 * Permission Editor Component
 * 
 * Allows editing permissions for a team member with grouped toggles
 */
@Component({
  selector: 'app-permission-editor',
  imports: [CommonModule],
  templateUrl: './permission-editor.component.html',
  styleUrl: './permission-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionEditorComponent {
  private readonly teamService = inject(TeamService);

  @Input() member: Administrator | null = null;
  @Input() roleTemplates: RoleTemplate[] = [];
  @Output() permissionsUpdated = new EventEmitter<void>();

  readonly modalRef = viewChild<ElementRef<HTMLDialogElement>>('modal');
  readonly selectedPermissions = signal<Set<string>>(new Set());
  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);

  open(member: Administrator | null): void {
    if (!member) return;
    
    this.member = member;
    const permissions = member.user?.roles?.[0]?.permissions ?? [];
    this.selectedPermissions.set(new Set(permissions));
    
    const modal = this.modalRef()?.nativeElement;
    modal?.showModal();
  }

  close(): void {
    const modal = this.modalRef()?.nativeElement;
    modal?.close();
  }

  togglePermission(permission: string): void {
    const current = new Set(this.selectedPermissions());
    if (current.has(permission)) {
      current.delete(permission);
    } else {
      current.add(permission);
    }
    this.selectedPermissions.set(current);
  }

  hasPermission(permission: string): boolean {
    return this.selectedPermissions().has(permission);
  }

  async save(): Promise<void> {
    if (!this.member) return;

    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      const permissions = Array.from(this.selectedPermissions());
      await this.teamService.updateMember(this.member.id, permissions);
      this.permissionsUpdated.emit();
      this.close();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to update permissions');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'DIALOG') {
      this.close();
    }
  }

  // Group permissions by category for better UX
  getGroupedPermissions(): Record<string, string[]> {
    const allPermissions = Array.from(this.selectedPermissions());
    const grouped: Record<string, string[]> = {
      'Catalog': [],
      'Orders': [],
      'Customers': [],
      'Products': [],
      'Settings': [],
      'Custom': [],
    };

    allPermissions.forEach(perm => {
      if (perm.includes('Catalog')) grouped['Catalog'].push(perm);
      else if (perm.includes('Order')) grouped['Orders'].push(perm);
      else if (perm.includes('Customer')) grouped['Customers'].push(perm);
      else if (perm.includes('Product')) grouped['Products'].push(perm);
      else if (perm.includes('Settings')) grouped['Settings'].push(perm);
      else grouped['Custom'].push(perm);
    });

    return grouped;
  }

  // Expose Object for template use
  readonly Object = Object;
}

