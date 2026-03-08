import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CustomerService, Customer, CustomerDetail, AddCustomerDto, UpdateCustomerDto } from '../core/services/customer/customer.service';

@Component({
  selector: 'app-customer',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './customer.html',
  styleUrl: './customer.css',
})
export class CustomerComponent implements OnInit {
  private customerService = inject(CustomerService);
  private fb = inject(FormBuilder);

  // State
  customers = signal<Customer[]>([]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // Filter
  searchName = signal('');
  pageNumber = signal(1);
  pageSize = signal(10);

  // Pagination info
  totalRecords = signal(0);
  totalPages = signal(0);

  // Deletion state
  customerToDelete = signal<number | null>(null);
  isDeleting = signal(false);

  // Toast state
  toastMessage = signal<{ text: string, type: 'success' | 'error' } | null>(null);

  // Form State
  isFormModalOpen = signal(false);
  isFormLoading = signal(false);
  isFormSubmitting = signal(false);
  isEditMode = signal(false);
  currentEditingId = signal<number | null>(null);
  customerForm!: FormGroup;

  // Image Upload State
  imageByte = signal<string | null>(null);
  imagePreviewUrl = signal<string | null>(null);

  ngOnInit(): void {
    this.initForm();
    this.load();
  }

  initForm(): void {
    this.customerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', Validators.required],
    });
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.customerService.getAll({
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      customerName: this.searchName()
    }).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.customers.set(res.data.data);
          this.totalRecords.set(res.data.totalRecords);
          this.totalPages.set(Math.ceil(res.data.totalRecords / this.pageSize()));
        } else {
          this.errorMessage.set(res.message ?? 'Failed to load customers.');
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
    this.pageNumber.set(1); // Reset to first page
    this.load();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(Number(size));
    this.pageNumber.set(1);
    this.load();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.pageNumber.set(page);
    this.load();
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

  // ── Modal ─────────────────────────────────────────────────────────────────

  selectedCustomer = signal<CustomerDetail | null>(null);
  isModalOpen = signal(false);
  isModalLoading = signal(false);

  openDetail(customerId: number): void {
    this.isModalOpen.set(true);
    this.isModalLoading.set(true);
    this.selectedCustomer.set(null);

    this.customerService.getById(customerId).subscribe({
      next: (res) => {
        if (res.status && res.data) this.selectedCustomer.set(res.data);
        this.isModalLoading.set(false);
      },
      error: () => this.isModalLoading.set(false)
    });
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedCustomer.set(null);
  }

  // Close modal on Escape key
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeModal();
    this.cancelDelete();
    this.closeFormModal();
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  confirmDelete(customerId: number, event: Event): void {
    event.stopPropagation();
    this.customerToDelete.set(customerId);
  }

  cancelDelete(): void {
    this.customerToDelete.set(null);
  }

  deleteCustomer(): void {
    const id = this.customerToDelete();
    if (id === null) return;

    this.isDeleting.set(true);
    this.customerService.deactivateCustomer(id).subscribe({
      next: (res) => {
        this.isDeleting.set(false);
        this.customerToDelete.set(null);
        if (res.status) {
          this.showToast('Customer deleted successfully.', 'success');
          this.load();
        } else {
          this.showToast(res.message ?? 'Failed to delete customer.', 'error');
        }
      },
      error: () => {
        this.isDeleting.set(false);
        this.customerToDelete.set(null);
        this.showToast('Network error while deleting customer.', 'error');
      }
    });
  }

  // ── Edit & Add Forms ──────────────────────────────────────────────

  onAdd(): void {
    this.isEditMode.set(false);
    this.currentEditingId.set(null);
    this.imageByte.set(null);
    this.imagePreviewUrl.set(null);
    this.customerForm.reset();
    this.isFormModalOpen.set(true);
  }

  onEdit(customerId: number, event: Event): void {
    event.stopPropagation();
    this.isEditMode.set(true);
    this.currentEditingId.set(customerId);
    this.imageByte.set(null);
    this.imagePreviewUrl.set(null);
    this.isFormModalOpen.set(true);
    this.isFormLoading.set(true);
    this.customerForm.reset();

    this.customerService.getById(customerId).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          const c = res.data;
          this.customerForm.patchValue({
            firstName: c.firstName,
            lastName: c.lastName,
            phone: c.phone || '',
            email: c.email,
            street: c.street,
            city: c.city,
            state: c.state,
            zipCode: c.zipCode
          });

          if (c.image) {
            this.imagePreviewUrl.set(this.getImageUrl(c.image));
          }
        } else {
          this.showToast(res.message ?? 'Failed to load customer details.', 'error');
          this.closeFormModal();
        }
        this.isFormLoading.set(false);
      },
      error: () => {
        this.showToast('Network error loading customer details.', 'error');
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
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    this.isFormSubmitting.set(true);
    const formValue = this.customerForm.value;
    const imgData = this.imageByte();

    if (this.isEditMode()) {
      const payload: UpdateCustomerDto = {
        id: this.currentEditingId()!,
        ...formValue,
        imagebyte: imgData
      };
      this.customerService.updateCustomer(payload).subscribe({
        next: (res) => {
          this.isFormSubmitting.set(false);
          if (res.status) {
            this.showToast('Customer updated successfully.', 'success');
            this.closeFormModal();
            this.load();
          } else {
            this.showToast(res.message ?? 'Failed to update customer.', 'error');
          }
        },
        error: () => {
          this.isFormSubmitting.set(false);
          this.showToast('Network error updating customer.', 'error');
        }
      });
    } else {
      const payload: AddCustomerDto = {
        ...formValue,
        imagebyte: imgData
      };
      this.customerService.addCustomer(payload).subscribe({
        next: (res) => {
          this.isFormSubmitting.set(false);
          if (res.status) {
            this.showToast('Customer added successfully.', 'success');
            this.closeFormModal();
            this.load();
          } else {
            this.showToast(res.message ?? 'Failed to add customer.', 'error');
          }
        },
        error: () => {
          this.isFormSubmitting.set(false);
          this.showToast('Network error adding customer.', 'error');
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

  getImageUrl(image: string): string {
    return image || 'https://ui-avatars.com/api/?name=User&background=3b82f6&color=fff';
  }
}
