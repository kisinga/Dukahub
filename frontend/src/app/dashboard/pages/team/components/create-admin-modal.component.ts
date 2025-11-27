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
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TeamService, type RoleTemplate } from '../../../../core/services/team.service';

/**
 * Multi-step modal for creating channel administrators
 * 
 * Steps:
 * 1. Info: Name, phone (required), email (optional)
 * 2. Role: Select template (shows permission summary)
 * 3. Permissions: Toggle overrides (pre-filled from template)
 * 4. Confirm: Re-enter phone number to confirm
 */
@Component({
  selector: 'app-create-admin-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-admin-modal.component.html',
  styleUrl: './create-admin-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateAdminModalComponent {
  private readonly teamService = inject(TeamService);
  private readonly fb = inject(FormBuilder);

  @Input() roleTemplates: RoleTemplate[] = [];
  @Output() memberCreated = new EventEmitter<void>();

  readonly modalRef = viewChild<ElementRef<HTMLDialogElement>>('modal');

  readonly step = signal(1);
  readonly error = signal<string | null>(null);
  readonly isSubmitting = signal(false);

  readonly form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      phoneNumber: ['', [Validators.required]],
      phoneConfirm: ['', [Validators.required]],
      emailAddress: [''],
      roleTemplateCode: ['', [Validators.required]],
      permissionOverrides: [[]],
    });
  }

  open(): void {
    this.step.set(1);
    this.error.set(null);
    this.form.reset();
    const modal = this.modalRef()?.nativeElement;
    modal?.showModal();
  }

  close(): void {
    const modal = this.modalRef()?.nativeElement;
    modal?.close();
  }

  nextStep(): void {
    if (this.step() === 1 && !this.form.get('firstName')?.valid && !this.form.get('lastName')?.valid && !this.form.get('phoneNumber')?.valid) {
      this.form.get('firstName')?.markAsTouched();
      this.form.get('lastName')?.markAsTouched();
      this.form.get('phoneNumber')?.markAsTouched();
      return;
    }
    if (this.step() === 2 && !this.form.get('roleTemplateCode')?.valid) {
      this.form.get('roleTemplateCode')?.markAsTouched();
      return;
    }
    if (this.step() === 3) {
      // Step 3 is optional, can proceed
    }
    if (this.step() === 4) {
      // This is the last step, submit instead
      this.submit();
      return;
    }
    this.step.set(this.step() + 1);
  }

  prevStep(): void {
    if (this.step() > 1) {
      this.step.set(this.step() - 1);
    }
  }

  getSelectedTemplate(): RoleTemplate | undefined {
    const code = this.form.get('roleTemplateCode')?.value;
    return this.roleTemplates.find(t => t.code === code);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const phoneNumber = this.form.get('phoneNumber')?.value;
    const phoneConfirm = this.form.get('phoneConfirm')?.value;

    if (phoneNumber !== phoneConfirm) {
      this.error.set('Phone numbers do not match');
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      const formValue = this.form.value;
      await this.teamService.createMember({
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        phoneNumber: formValue.phoneNumber,
        emailAddress: formValue.emailAddress || undefined,
        roleTemplateCode: formValue.roleTemplateCode,
        permissionOverrides: formValue.permissionOverrides?.length > 0 ? formValue.permissionOverrides : undefined,
      });

      this.memberCreated.emit();
      this.close();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to create team member');
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
}

