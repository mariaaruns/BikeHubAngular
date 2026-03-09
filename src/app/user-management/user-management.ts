import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, User, Role, AddUserDto, UpdateUserDto } from '../core/services/user/user.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css',
})
export class UserManagement implements OnInit {
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // State
  users = signal<User[]>([]);
  roles = signal<Role[]>([]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // Filter
  searchName = signal('');
  searchRole = signal('');
  pageNumber = signal(1);
  pageSize = signal(10);

  // Pagination info
  totalRecords = signal(0);
  totalPages = signal(0);

  // Deletion state
  userToDelete = signal<number | null>(null);
  isDeleting = signal(false);

  // Toast state
  toastMessage = signal<{ text: string, type: 'success' | 'error' } | null>(null);

  // Form State
  isFormModalOpen = signal(false);
  isFormLoading = signal(false);
  isFormSubmitting = signal(false);
  isEditMode = signal(false);
  currentEditingId = signal<number | null>(null);
  userForm!: FormGroup;

  // Image Upload State
  imageByte = signal<string | null>(null);
  imagePreviewUrl = signal<string | null>(null);

  // Initialize form and load initial user data
  ngOnInit(): void {
    this.initForm();
    this.loadRoles();
    this.loadUsers();
  }

  initForm(): void {
    this.userForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      userName: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required],
      roleId: ['', Validators.required], // changed from roleName to roleId
      password: [''] // will make required dynamically for "Add"
    });
  }

  loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.roles.set(res.data);
        }
      },
      error: () => console.error('Failed to load roles')
    });
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Provide only the allowed UserFilter properties
    this.userService.getUsers({
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      searchName: this.searchName().trim(),
      searchRole: this.searchRole().trim()
    }).subscribe({
      next: (res) => {
        // ... (we'll also need to handle filtering by role client-side if the API dropped it, 
        // or apply the search text if needed, but given the user's manual change to UserFilter,
        // we adhere to the API payload strictly).
        if (res.status && res.data) {
          // Let's implement local filtering since the API filter properties were removed
          let filtered = res.data.data;
          // const sName = this.searchName().trim().toLowerCase();
          // const sRole = this.searchRole();

          // if (sName) {
          //   filtered = filtered.filter(u =>
          //     (u.firstName + ' ' + u.lastName).toLowerCase().includes(sName) ||
          //     u.userName.toLowerCase().includes(sName)
          //   );
          // }
          // if (sRole) {
          //   filtered = filtered.filter(u => u.roleName === sRole);
          // }

          this.users.set(filtered);
          this.totalRecords.set(res.data.totalRecords);
          this.totalPages.set(Math.ceil(res.data.totalRecords / this.pageSize()));
        } else {
          this.errorMessage.set(res.message ?? 'Failed to load users.');
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Network error. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  onSearch(): void {
    this.pageNumber.set(1);
    this.loadUsers();
  }

  onRoleChange(role: string): void {
    this.searchRole.set(role);
    this.pageNumber.set(1);
    this.loadUsers();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(Number(size));
    this.pageNumber.set(1);
    this.loadUsers();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.pageNumber.set(page);
    this.loadUsers();
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.pageNumber();
    const delta = 2;
    const pages: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      pages.push(i);
    }
    return pages;
  }

  // Close modal on Escape key
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cancelDelete();
    this.closeFormModal();
  }

  // ── Permissions ─────────────────────────────────────────────────────────────

  onPermissionClick(user: User): void {
    this.router.navigate(['/user-management', user.userId, 'permissions']);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  confirmDelete(userId: number): void {
    this.userToDelete.set(userId);
  }

  cancelDelete(): void {
    this.userToDelete.set(null);
  }

  deleteUser(): void {
    const id = this.userToDelete();
    if (id === null) return;

    this.isDeleting.set(true);
    this.userService.deleteUser(id).subscribe({
      next: (res) => {
        this.isDeleting.set(false);
        this.userToDelete.set(null);
        if (res.status) {
          this.showToast('User deleted successfully.', 'success');
          this.loadUsers();
        } else {
          this.showToast(res.message ?? 'Failed to delete user.', 'error');
        }
      },
      error: () => {
        this.isDeleting.set(false);
        this.userToDelete.set(null);
        this.showToast('Network error while deleting user.', 'error');
      }
    });
  }

  // ── Edit & Add Forms ──────────────────────────────────────────────

  onAdd(): void {
    this.isEditMode.set(false);
    this.currentEditingId.set(null);
    this.imageByte.set(null);
    this.imagePreviewUrl.set(null);
    this.userForm.reset();

    // Password is required for ADD
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();

    this.isFormModalOpen.set(true);
  }

  onEdit(userId: number): void {
    this.isEditMode.set(true);
    this.currentEditingId.set(userId);
    this.imageByte.set(null);
    this.imagePreviewUrl.set(null);
    this.isFormModalOpen.set(true);
    this.isFormLoading.set(true);
    this.userForm.reset();

    // Password is NOT required for EDIT
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();

    this.userService.getUserById(userId).subscribe({
      next: (res: any) => {
        if (res.status && res.data) {
          const u = res.data;



          this.userForm.patchValue({
            firstName: u.firstName,
            lastName: u.lastName,
            userName: u.userName,
            phoneNumber: u.phoneNumber || '',
            roleId: u.roleId // mapping to roleId for binding
          });

          if (u.image) {
            this.imagePreviewUrl.set(this.getImageUrl(u.image));
          }
        } else {
          this.showToast(res.message ?? 'Failed to load user details.', 'error');
          this.closeFormModal();
        }
        this.isFormLoading.set(false);
      },
      error: () => {
        this.showToast('Network error loading user details.', 'error');
        this.isFormLoading.set(false);
        this.closeFormModal();
      }
    });
  }

  onFileSelected(event: Event): void {
    const fileNode = event.target as HTMLInputElement;
    const file = fileNode.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Url = e.target?.result as string;
        this.imagePreviewUrl.set(base64Url);

        // Strip out the data:image prefix to extract raw base64 string
        const base64Data = base64Url.split(',')[1];
        this.imageByte.set(base64Data);
      };
      reader.readAsDataURL(file);
    }
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.imageByte.set(null);
    this.imagePreviewUrl.set(null);
  }

  submitForm(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isFormSubmitting.set(true);
    const formValue = this.userForm.value;
    const imgData = this.imageByte();

    if (this.isEditMode()) {
      const payload: UpdateUserDto = {
        userId: this.currentEditingId()!,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        roleId: Number(formValue.roleId),
        phoneNumber: formValue.phoneNumber,
        imagebyte: imgData
      };

      this.userService.updateUser(payload).subscribe({
        next: (res) => {
          this.isFormSubmitting.set(false);
          if (res.status) {
            this.showToast('User updated successfully.', 'success');
            this.closeFormModal();
            this.loadUsers();
          } else {
            this.showToast(res.message ?? 'Failed to update user.', 'error');
          }
        },
        error: () => {
          this.isFormSubmitting.set(false);
          this.showToast('Network error updating user.', 'error');
        }
      });
    } else {
      const payload: AddUserDto = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        userName: formValue.userName,
        password: formValue.password,
        roleId: Number(formValue.roleId),
        phoneNumber: formValue.phoneNumber,
        imagebyte: imgData
      };

      this.userService.addUser(payload).subscribe({
        next: (res) => {
          this.isFormSubmitting.set(false);
          if (res.status) {
            this.showToast('User added successfully.', 'success');
            this.closeFormModal();
            this.loadUsers();
          } else {
            this.showToast(res.message ?? 'Failed to add user.', 'error');
          }
        },
        error: () => {
          this.isFormSubmitting.set(false);
          this.showToast('Network error adding user.', 'error');
        }
      });
    }
  }

  // ── Toasts ────────────────────────────────────────────────────────────────

  showToast(text: string, type: 'success' | 'error'): void {
    this.toastMessage.set({ text, type });
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }

  getImageUrl(image: string | null): string {
    return image || 'https://ui-avatars.com/api/?name=User&background=3b82f6&color=fff';
  }
}

