import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AlertBanner } from '../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../shared/ui/button/button';
import { FileDropzone } from '../../../shared/ui/file-dropzone/file-dropzone';
import { PasswordField } from '../../../shared/ui/password-field/password-field';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { AppError } from '../../../core/interfaces/api-response.model';
import { ClientProfile, UpdateClientProfilePayload } from '../../../core/interfaces/client-profile.model';
import { ClientProfileService } from '../../../core/services/client-profile.service';
import { ClientProfileStateService } from '../../../core/services/client-profile-state.service';
import { AuthService } from '../../../core/services/auth.service';
import { passwordsMatchValidator } from '../../../shared/validators/password-match.validator';
import { notifyError, notifySuccess } from '../../../shared/utils/notify';

interface ChecklistItem {
  /** i18n key resolved in the template with the translate pipe. */
  labelKey: string;
  icon: string;
  done: boolean;
}

/**
 * Client-facing "My Profile" page: a premium, multi-card dashboard view of
 * the client's own profile, with editing moved into a focused modal
 * (opened from the hero header or from any "+ Add" empty-state prompt).
 *
 * Ownership is enforced server-side (ClientController always resolves "me"
 * from the authenticated user id) — this page never passes a client id to
 * any endpoint. No backend or API changes were made for this redesign;
 * "profile completion" is a pure client-side computation over the fields
 * ClientProfile already exposes, and the Security/Preferences cards are
 * presented as coming-soon (no endpoints exist for them yet), matching the
 * same disabled/"Coming soon" pattern already used elsewhere in the app
 * (e.g. the client sidebar's "My Bookings" link).
 */
@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [ReactiveFormsModule, TextField, PasswordField, FileDropzone, Button, AlertBanner, DatePipe, TranslatePipe],
  templateUrl: './client-profile.html',
  styleUrl: './client-profile.css',
})
export class ClientProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clientProfileService = inject(ClientProfileService);
  private readonly clientProfileState = inject(ClientProfileStateService);
  private readonly authService = inject(AuthService);
  private readonly translate = inject(TranslateService);

  protected readonly profile = signal<ClientProfile | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<AppError | null>(null);

  protected readonly editModalOpen = signal(false);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [''],
    city: [''],
    dateOfBirth: [''],
    avatarFile: this.fb.control<File | null>(null),
  });

  // Change-password form (control names "password"/"confirmPassword" so
  // passwordsMatchValidator can be reused as-is). Posts to the existing
  // AuthService.changePassword (POST /api/auth/change-password).
  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  protected readonly changingPassword = signal(false);
  protected readonly passwordError = signal<AppError | null>(null);

  /** Pure display computation — no persistence, nothing sent to the backend. */
  protected readonly checklist = computed<ChecklistItem[]>(() => {
    const p = this.profile();
    return [
      { labelKey: 'profile.checklist.photo', icon: 'photo_camera', done: !!p?.avatarUrl },
      { labelKey: 'profile.checklist.fullName', icon: 'badge', done: !!p?.fullName },
      { labelKey: 'profile.checklist.email', icon: 'mail', done: !!p?.email },
      { labelKey: 'profile.checklist.phone', icon: 'call', done: !!p?.phoneNumber },
      { labelKey: 'profile.checklist.city', icon: 'location_on', done: !!p?.city },
      { labelKey: 'profile.checklist.dateOfBirth', icon: 'cake', done: !!p?.dateOfBirth },
    ];
  });

  protected readonly completionPercent = computed(() => {
    const items = this.checklist();
    if (items.length === 0) {
      return 0;
    }
    const done = items.filter((item) => item.done).length;
    return Math.round((done / items.length) * 100);
  });

  protected readonly missingItems = computed(() => this.checklist().filter((item) => !item.done));

  ngOnInit(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.clientProfileService.getMyProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.loadError.set(err);
        this.loading.set(false);
      },
    });
  }

  protected openEdit(): void {
    this.patchFormFromProfile();
    this.editModalOpen.set(true);
  }

  protected closeEdit(): void {
    this.editModalOpen.set(false);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: UpdateClientProfilePayload = {
      fullName: value.fullName,
      email: value.email,
      phoneNumber: value.phoneNumber || undefined,
      city: value.city || undefined,
      dateOfBirth: value.dateOfBirth || undefined,
      avatarFile: value.avatarFile ?? undefined,
    };

    this.saving.set(true);

    this.clientProfileService.updateMyProfile(payload).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.clientProfileState.refresh();
        this.saving.set(false);
        this.editModalOpen.set(false);
        notifySuccess(this.translate.instant('profile.toast.updated') as string);
      },
      error: (err: AppError) => {
        this.saving.set(false);
        notifyError(this.translate.instant('profile.toast.updateFailed') as string, err.message);
      },
    });
  }

  protected submitPassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, password, confirmPassword } = this.passwordForm.getRawValue();
    this.changingPassword.set(true);
    this.passwordError.set(null);

    this.authService
      .changePassword({
        currentPassword,
        newPassword: password,
        confirmNewPassword: confirmPassword,
      })
      .subscribe({
        next: () => {
          this.changingPassword.set(false);
          this.passwordForm.reset();
          notifySuccess(this.translate.instant('profile.toast.passwordChanged') as string);
        },
        error: (err: AppError) => {
          this.changingPassword.set(false);
          this.passwordError.set(err);
          notifyError(this.translate.instant('profile.toast.passwordFailed') as string, err.message);
        },
      });
  }

  protected passwordMismatch(): boolean {
    return (
      this.passwordForm.hasError('passwordMismatch') &&
      this.passwordForm.get('confirmPassword')!.touched
    );
  }

  private patchFormFromProfile(): void {
    const profile = this.profile();
    if (!profile) {
      return;
    }

    this.form.reset({
      fullName: profile.fullName,
      email: profile.email,
      phoneNumber: profile.phoneNumber ?? '',
      city: profile.city ?? '',
      dateOfBirth: profile.dateOfBirth ?? '',
      avatarFile: null,
    });
  }
}
