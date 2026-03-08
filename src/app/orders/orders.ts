import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, Order, OrderFilter, OrderDetail } from '../core/services/order/order.service';
import { DropdownService, DropdownItem } from '../core/services/dropdown/dropdown.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit {
  private orderService = inject(OrderService);
  private dropdownService = inject(DropdownService);

  // State
  orders = signal<Order[]>([]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // Filter Models
  searchOrderId = signal<number | null>(null);
  searchOrderStatus = signal<number | null>(null);
  searchStartDate = signal<string | null>(null);

  // Pagination
  pageNumber = signal(1);
  pageSize = signal(10);
  totalRecords = signal(0);
  totalPages = signal(0);

  // Dropdowns
  orderStatuses = signal<DropdownItem[]>([]);

  ngOnInit(): void {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    this.searchStartDate.set(`${year}-${month}`);

    this.loadDropdowns();
  }

  loadDropdowns(): void {
    this.dropdownService.getDropdown('orderstatus').subscribe({
      next: (res) => {
        if (res.status && res.data && res.data.length > 0) {
          this.orderStatuses.set(res.data);
          this.searchOrderStatus.set(res.data[0].value);
          this.load(); // Load orders AFTER setting the default status
        } else {
          this.load(); // Load anyway if no dropdown data
        }
      },
      error: () => this.load() // Load anyway on error
    });
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filter: OrderFilter = {
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      orderId: this.searchOrderId() || null,
      orderStatus: this.searchOrderStatus() || null,
      startDate: this.searchStartDate() || null
    };

    this.orderService.getOrders(filter).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.orders.set(res.data.data);
          this.totalRecords.set(res.data.totalRecords);
          this.totalPages.set(Math.ceil(res.data.totalRecords / this.pageSize()));
        } else {
          this.orders.set([]);
          this.totalRecords.set(0);
          this.totalPages.set(0);
          this.errorMessage.set(res.message ?? 'No orders found.');
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.orders.set([]);
        this.totalRecords.set(0);
        this.totalPages.set(0);
        this.errorMessage.set('Network error while loading orders.');
        this.isLoading.set(false);
      }
    });
  }

  onFilter(): void {
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

  getStatusClass(status: string): string {
    const s = status.toLowerCase();
    if (s.includes('completed') || s.includes('delivered')) return 'status-completed';
    if (s.includes('pending') || s.includes('processing')) return 'status-pending';
    if (s.includes('cancel') || s.includes('failed')) return 'status-cancelled';
    return 'status-default';
  }

  getImageUrl(image: string | null | undefined): string {
    return image || 'assets/placeholder.png'; // Will fallback to ui-avatars via template
  }

  // --- Inline Status Update Logic ---

  pendingStatusUpdates = signal<Map<number, number>>(new Map());
  isUpdating = signal(false);
  toasts = signal<{ id: number; text: string; type: 'success' | 'error' }[]>([]);

  onStatusChange(orderId: number, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = Number(target.value);
    const newMap = new Map(this.pendingStatusUpdates());
    newMap.set(orderId, value);
    this.pendingStatusUpdates.set(newMap);
  }

  updateStatus(orderId: number): void {
    const statusId = this.pendingStatusUpdates().get(orderId);
    if (!statusId) return;

    this.isUpdating.set(true);
    this.orderService.updateOrderStatus({ orderId, orderStatusId: statusId }).subscribe({
      next: (res) => {
        if (res.status) {
          this.showToast('Status updated successfully.', 'success');
          // Reload orders to reflect the saved state properly
          this.load();
        } else {
          this.showToast(res.message || 'Error updating status.', 'error');
        }
        this.isUpdating.set(false);
        const newMap = new Map(this.pendingStatusUpdates());
        newMap.delete(orderId);
        this.pendingStatusUpdates.set(newMap);
      },
      error: () => {
        this.showToast('Network error while updating status.', 'error');
        this.isUpdating.set(false);
      }
    });
  }

  // --- Order Details Modal Logic ---

  isDetailModalOpen = signal(false);
  isDetailLoading = signal(false);
  selectedOrderDetail = signal<OrderDetail | null>(null);

  viewOrderDetails(orderId: number): void {
    this.isDetailModalOpen.set(true);
    this.isDetailLoading.set(true);
    this.selectedOrderDetail.set(null);

    this.orderService.getOrderDetail(orderId).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.selectedOrderDetail.set(res.data);
        } else {
          this.showToast(res.message || 'Error fetching order details.', 'error');
          this.isDetailModalOpen.set(false);
        }
        this.isDetailLoading.set(false);
      },
      error: () => {
        this.showToast('Network error while fetching order details.', 'error');
        this.isDetailLoading.set(false);
        this.isDetailModalOpen.set(false);
      }
    });
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedOrderDetail.set(null);
  }

  showToast(text: string, type: 'success' | 'error'): void {
    const id = Date.now();
    this.toasts.update((t) => [...t, { id, text, type }]);
    setTimeout(() => {
      this.toasts.update((t) => t.filter((toast) => toast.id !== id));
    }, 4000);
  }
}

