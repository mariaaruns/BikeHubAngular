import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BrandService, Brand as BrandModel, AddBrandDto, UpdateBrandDto } from '../../core/services/brand/brand.service';

@Component({
  selector: 'app-brand',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './brand.html',
  styleUrl: './brand.css',
})
export class Brand implements OnInit {
  private brandService = inject(BrandService);
  private fb = inject(FormBuilder);

  // State
  brands = signal<BrandModel[]>([]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // Filter
  searchName = signal('');

  // Deletion state
  brandToDelete = signal<number | null>(null);
  isDeleting = signal(false);

  // Toast state
  toastMessage = signal<{text: string, type: 'success'|'error'} | null>(null);
  
  // Form State
  isFormModalOpen = signal(false);
  isFormLoading = signal(false);
  isFormSubmitting = signal(false);
  isEditMode = signal(false);
  currentEditingId = signal<number | null>(null);
  brandForm!: FormGroup;

  // Image Upload State
  imageByte = signal<string | null>(null);
  imagePreviewUrl = signal<string | null>(null);

  ngOnInit(): void {
    this.initForm();
    this.load();
  }

  initForm(): void {
    this.brandForm = this.fb.group({
      brandName: ['', Validators.required]
    });
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.brandService.getAll(this.searchName() || undefined).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.brands.set(res.data);
        } else {
          this.errorMessage.set(res.message ?? 'Failed to load brands.');
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
    this.load();
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  // Close modal on Escape key
  @HostListener('document:keydown.escape')
  onEscape(): void { 
    this.cancelDelete();
    this.closeFormModal();
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  confirmDelete(brandId: number, event: Event): void {
    event.stopPropagation();
    this.brandToDelete.set(brandId);
  }

  cancelDelete(): void {
    this.brandToDelete.set(null);
  }

  deleteBrand(): void {
    const id = this.brandToDelete();
    if (id === null) return;

    this.isDeleting.set(true);
    this.brandService.deleteBrand(id).subscribe({
      next: (res) => {
        this.isDeleting.set(false);
        this.brandToDelete.set(null);
        if (res.status) {
          this.showToast('Brand deleted successfully.', 'success');
          this.load();
        } else {
          this.showToast(res.message ?? 'Failed to delete brand.', 'error');
        }
      },
      error: () => {
        this.isDeleting.set(false);
        this.brandToDelete.set(null);
        this.showToast('Network error while deleting brand.', 'error');
      }
    });
  }

  // ── Edit & Add Forms ──────────────────────────────────────────────
  
  onAdd(): void {
    this.isEditMode.set(false);
    this.currentEditingId.set(null);
    this.imageByte.set(null);
    this.imagePreviewUrl.set(null);
    this.brandForm.reset();
    this.isFormModalOpen.set(true);
  }

  onEdit(brandId: number, event: Event): void {
    event.stopPropagation();
    this.isEditMode.set(true);
    this.currentEditingId.set(brandId);
    this.imageByte.set(null);
    this.imagePreviewUrl.set(null);
    this.isFormModalOpen.set(true);
    this.isFormLoading.set(true);
    this.brandForm.reset();

    this.brandService.getById(brandId).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          const b = res.data;
          this.brandForm.patchValue({
            brandName: b.brandName
          });
          
          if (b.image) {
            this.imagePreviewUrl.set(this.getImageUrl(b.image));
          }
        } else {
          this.showToast(res.message ?? 'Failed to load brand details.', 'error');
          this.closeFormModal();
        }
        this.isFormLoading.set(false);
      },
      error: () => {
        this.showToast('Network error loading brand details.', 'error');
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
    if (this.brandForm.invalid) {
      this.brandForm.markAllAsTouched();
      return;
    }

    this.isFormSubmitting.set(true);
    const formValue = this.brandForm.value;
    const imgData = this.imageByte();

    if (this.isEditMode()) {
      const payload: UpdateBrandDto = {
        brandId: this.currentEditingId()!,
        ...formValue,
        imagebyte: imgData
      };
      this.brandService.updateBrand(payload).subscribe({
        next: (res) => {
          this.isFormSubmitting.set(false);
          if (res.status) {
            this.showToast('Brand updated successfully.', 'success');
            this.closeFormModal();
            this.load();
          } else {
            this.showToast(res.message ?? 'Failed to update brand.', 'error');
          }
        },
        error: () => {
          this.isFormSubmitting.set(false);
          this.showToast('Network error updating brand.', 'error');
        }
      });
    } else {
      const payload: AddBrandDto = {
        ...formValue,
        imagebyte: imgData
      };
      this.brandService.addBrand(payload).subscribe({
        next: (res) => {
          this.isFormSubmitting.set(false);
          if (res.status) {
            this.showToast('Brand added successfully.', 'success');
            this.closeFormModal();
            this.load();
          } else {
            this.showToast(res.message ?? 'Failed to add brand.', 'error');
          }
        },
        error: () => {
          this.isFormSubmitting.set(false);
          this.showToast('Network error adding brand.', 'error');
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
    return image || 'https://ui-avatars.com/api/?name=Brand&background=3b82f6&color=fff';
  }
}
