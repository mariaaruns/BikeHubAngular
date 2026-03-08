import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CategoryService, Category, AddCategoryDto, UpdateCategoryDto } from '../../core/services/category/category.service';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './category.html',
  styleUrl: './category.css',
})
export class CategoryComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private fb = inject(FormBuilder);

  // State
  categories = signal<Category[]>([]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // Filter
  searchName = signal('');

  // Deletion state
  categoryToDelete = signal<number | null>(null);
  isDeleting = signal(false);

  // Toast state
  toastMessage = signal<{ text: string, type: 'success' | 'error' } | null>(null);

  // Form State
  isFormModalOpen = signal(false);
  isFormLoading = signal(false);
  isFormSubmitting = signal(false);
  isEditMode = signal(false);
  currentEditingId = signal<number | null>(null);
  categoryForm!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.load();
  }

  initForm(): void {
    this.categoryForm = this.fb.group({
      categoryName: ['', Validators.required]
    });
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.categoryService.getCategory(this.searchName() || undefined).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.categories.set(res.data);
        } else {
          this.errorMessage.set(res.message ?? 'Failed to load categories.');
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

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cancelDelete();
    this.closeFormModal();
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  confirmDelete(categoryId: number, event: Event): void {
    event.stopPropagation();
    this.categoryToDelete.set(categoryId);
  }

  cancelDelete(): void {
    this.categoryToDelete.set(null);
  }

  deleteCategory(): void {
    const id = this.categoryToDelete();
    if (id === null) return;

    this.isDeleting.set(true);
    this.categoryService.deleteCategory(id).subscribe({
      next: (res) => {
        this.isDeleting.set(false);
        this.categoryToDelete.set(null);
        if (res.status) {
          this.showToast('Category deleted successfully.', 'success');
          this.load();
        } else {
          this.showToast(res.message ?? 'Failed to delete category.', 'error');
        }
      },
      error: () => {
        this.isDeleting.set(false);
        this.categoryToDelete.set(null);
        this.showToast('Network error while deleting category.', 'error');
      }
    });
  }

  // ── Edit & Add Forms ──────────────────────────────────────────────

  onAdd(): void {
    this.isEditMode.set(false);
    this.currentEditingId.set(null);
    this.categoryForm.reset();
    this.isFormModalOpen.set(true);
  }

  onEdit(categoryId: number, event: Event): void {
    event.stopPropagation();
    this.isEditMode.set(true);
    this.currentEditingId.set(categoryId);
    this.isFormModalOpen.set(true);
    this.isFormLoading.set(true);
    this.categoryForm.reset();

    this.categoryService.getCategoryById(categoryId).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          const c = res.data;
          this.categoryForm.patchValue({
            categoryName: c.categoryName
          });
        } else {
          this.showToast(res.message ?? 'Failed to load category details.', 'error');
          this.closeFormModal();
        }
        this.isFormLoading.set(false);
      },
      error: () => {
        this.showToast('Network error loading category details.', 'error');
        this.isFormLoading.set(false);
        this.closeFormModal();
      }
    });
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
  }

  submitForm(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.isFormSubmitting.set(true);
    const formValue = this.categoryForm.value;

    if (this.isEditMode()) {
      const payload: UpdateCategoryDto = {
        categoryId: this.currentEditingId()!,
        ...formValue
      };
      this.categoryService.updateCategory(payload).subscribe({
        next: (res) => {
          this.isFormSubmitting.set(false);
          if (res.status) {
            this.showToast('Category updated successfully.', 'success');
            this.closeFormModal();
            this.load();
          } else {
            this.showToast(res.message ?? 'Failed to update category.', 'error');
          }
        },
        error: () => {
          this.isFormSubmitting.set(false);
          this.showToast('Network error updating category.', 'error');
        }
      });
    } else {
      const payload: AddCategoryDto = {
        ...formValue
      };
      this.categoryService.addCategory(payload).subscribe({
        next: (res) => {
          this.isFormSubmitting.set(false);
          if (res.status) {
            this.showToast('Category added successfully.', 'success');
            this.closeFormModal();
            this.load();
          } else {
            this.showToast(res.message ?? 'Failed to add category.', 'error');
          }
        },
        error: () => {
          this.isFormSubmitting.set(false);
          this.showToast('Network error adding category.', 'error');
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
}
