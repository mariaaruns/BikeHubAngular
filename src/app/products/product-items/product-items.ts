import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService, Product, ProductDetail, AddProductDto, UpdateProductDto } from '../../core/services/product/product.service';
import { DropdownService, DropdownItem } from '../../core/services/dropdown/dropdown.service';

@Component({
  selector: 'app-product-items',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './product-items.html',
  styleUrl: './product-items.css',
})
export class ProductItems implements OnInit {
  private productService = inject(ProductService);
  private dropdownService = inject(DropdownService);
  private fb = inject(FormBuilder);

  // State
  products = signal<Product[]>([]);
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
  productToDelete = signal<number | null>(null);
  isDeleting = signal(false);

  // Toast state
  toastMessage = signal<{ text: string, type: 'success' | 'error' } | null>(null);

  // Form State
  isFormModalOpen = signal(false);
  isFormLoading = signal(false);
  isFormSubmitting = signal(false);
  isEditMode = signal(false);
  currentEditingId = signal<number | null>(null);
  productForm!: FormGroup;

  // Dropdowns
  categories = signal<DropdownItem[]>([]);
  brands = signal<DropdownItem[]>([]);

  // Image Upload State
  imageByte = signal<string | null>(null);
  imagePreviewUrl = signal<string | null>(null);

  ngOnInit(): void {
    this.initForm();
    this.loadDropdowns();
    this.load();
  }

  initForm(): void {
    this.productForm = this.fb.group({
      productName: ['', Validators.required],
      brandId: ['', Validators.required],
      categoryId: ['', Validators.required],
      modelYear: ['', Validators.required],
      listPrice: ['', Validators.required],
      stockQty: [0]
    });
  }

  loadDropdowns(): void {
    this.dropdownService.getDropdown('category').subscribe({
      next: (res) => {
        if (res.status && res.data) this.categories.set(res.data);
      }
    });

    this.dropdownService.getDropdown('brand').subscribe({
      next: (res) => {
        if (res.status && res.data) this.brands.set(res.data);
      }
    });
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.productService.getProducts({
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      productNameFilter: this.searchName() || null
    }).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.products.set(res.data.data);
          this.totalRecords.set(res.data.totalRecords);
          this.totalPages.set(Math.ceil(res.data.totalRecords / this.pageSize()));
        } else {
          this.errorMessage.set(res.message ?? 'Failed to load products.');
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
    this.load();
  }

  onPageSizeChange(size: number | string): void {
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

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cancelDelete();
    this.closeFormModal();
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  confirmDelete(productId: number, event: Event): void {
    event.stopPropagation();
    this.productToDelete.set(productId);
  }

  cancelDelete(): void {
    this.productToDelete.set(null);
  }

  deleteProduct(): void {
    const id = this.productToDelete();
    if (id === null) return;

    this.isDeleting.set(true);
    this.productService.deactivateProduct(id).subscribe({
      next: (res) => {
        this.isDeleting.set(false);
        this.productToDelete.set(null);
        if (res.status) {
          this.showToast('Product deactivated successfully.', 'success');
          this.load();
        } else {
          this.showToast(res.message ?? 'Failed to deactivate product.', 'error');
        }
      },
      error: () => {
        this.isDeleting.set(false);
        this.productToDelete.set(null);
        this.showToast('Network error while deactivating product.', 'error');
      }
    });
  }

  // ── Edit & Add Forms ──────────────────────────────────────────────

  onAdd(): void {
    this.isEditMode.set(false);
    this.currentEditingId.set(null);
    this.imageByte.set(null);
    this.imagePreviewUrl.set(null);
    this.productForm.reset();
    this.productForm.patchValue({ stockQty: 0 }); // Default value
    this.isFormModalOpen.set(true);
  }

  onEdit(productId: number, event: Event): void {
    event.stopPropagation();
    this.isEditMode.set(true);
    this.currentEditingId.set(productId);
    this.imageByte.set(null);
    this.imagePreviewUrl.set(null);
    this.isFormModalOpen.set(true);
    this.isFormLoading.set(true);
    this.productForm.reset();

    this.productService.getProductById(productId).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          const p = res.data;
          this.productForm.patchValue({
            productName: p.productName,
            brandId: p.brandId,
            categoryId: p.categoryId,
            modelYear: p.modelYear,
            listPrice: p.price,
            stockQty: p.stock
          });

          if (p.productImage) {
            this.imagePreviewUrl.set(this.getImageUrl(p.productImage));
          }
        } else {
          this.showToast(res.message ?? 'Failed to load product details.', 'error');
          this.closeFormModal();
        }
        this.isFormLoading.set(false);
      },
      error: () => {
        this.showToast('Network error loading product details.', 'error');
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
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.isFormSubmitting.set(true);
    const formValue = this.productForm.value;
    const imgData = this.imageByte();

    if (this.isEditMode()) {
      const payload: UpdateProductDto = {
        productId: this.currentEditingId()!,
        productName: formValue.productName,
        brandId: Number(formValue.brandId),
        categoryId: Number(formValue.categoryId),
        modelYear: Number(formValue.modelYear),
        listPrice: Number(formValue.listPrice),
        stockQty: Number(formValue.stockQty || 0),
        imagebyte: imgData
      };
      this.productService.updateProduct(payload).subscribe({
        next: (res) => {
          this.isFormSubmitting.set(false);
          if (res.status) {
            this.showToast('Product updated successfully.', 'success');
            this.closeFormModal();
            this.load();
          } else {
            this.showToast(res.message ?? 'Failed to update product.', 'error');
          }
        },
        error: () => {
          this.isFormSubmitting.set(false);
          this.showToast('Network error updating product.', 'error');
        }
      });
    } else {
      const payload: AddProductDto = {
        productName: formValue.productName,
        brandId: Number(formValue.brandId),
        categoryId: Number(formValue.categoryId),
        modelYear: Number(formValue.modelYear),
        listPrice: Number(formValue.listPrice),
        stockQty: Number(formValue.stockQty || 0),
        imagebyte: imgData
      };
      this.productService.addProduct(payload).subscribe({
        next: (res) => {
          this.isFormSubmitting.set(false);
          if (res.status) {
            this.showToast('Product added successfully.', 'success');
            this.closeFormModal();
            this.load();
          } else {
            this.showToast(res.message ?? 'Failed to add product.', 'error');
          }
        },
        error: () => {
          this.isFormSubmitting.set(false);
          this.showToast('Network error adding product.', 'error');
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

  getImageUrl(image: string | null | undefined): string {
    return image || 'assets/placeholder2.png'; // Will change to use ProductImageUrl in the template where needed, fallback for safe calls in generic spots
  }
}
