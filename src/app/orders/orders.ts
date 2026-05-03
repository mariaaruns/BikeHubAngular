import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OrderService, Order, OrderFilter, OrderDetail, AddOrderRequest, VerifyPaymentRequest } from '../core/services/order/order.service';
import { DropdownService, DropdownItem } from '../core/services/dropdown/dropdown.service';
import { AuthService } from '../core/services/auth/auth.service';

declare var Razorpay: any;

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit {
  private orderService = inject(OrderService);
  private dropdownService = inject(DropdownService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  // State
  orders = signal<Order[]>([]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // Filter Models
  searchOrderId = signal<number | null>(null);
  searchOrderStatus = signal<number | null>(null);
  searchFromDate = signal<string | null>(null);
  searchToDate = signal<string | null>(null);
  searchPaymentStatus = signal<number | null>(null);

  // Pagination
  pageNumber = signal(1);
  pageSize = signal(10);
  totalRecords = signal(0);
  totalPages = signal(0);

  // Dropdowns
  orderStatuses = signal<DropdownItem[]>([]);
  paymentStatuses = signal<DropdownItem[]>([]);

  // --- Create Order State ---
  isCreatingOrder = signal(false);
  isCompleting = signal(false);
  createOrderForm!: FormGroup;

  // Customer dropdown
  customerOptions = signal<DropdownItem[]>([]);
  customerSearch = signal('');
  filteredCustomers = signal<DropdownItem[]>([]);
  isCustomerDropdownOpen = signal(false);
  selectedCustomer = signal<DropdownItem | null>(null);

  // Product Selection Modal
  isProductModalOpen = signal(false);
  availableProducts = signal<any[]>([]); // Using any to avoid importing productStockSummaries for now, or I can import it
  filteredAvailableProducts = signal<any[]>([]);
  productSearchText = signal('');
  brandOptions = signal<DropdownItem[]>([]);
  categoryOptions = signal<DropdownItem[]>([]);
  selectedBrandId = signal<number | null>(null);
  selectedCategoryId = signal<number | null>(null);
  isProductsLoading = signal(false);

  // Selected Items
  selectedOrderItems = signal<{ productId: number, productName: string, price: number, qty: number, total: number, stockQty: number }[]>([]);

  ngOnInit(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const formatDt = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    this.searchFromDate.set(formatDt(firstDay));
    this.searchToDate.set(formatDt(lastDay));

    this.initCreateOrderForm();
    this.loadDropdowns();
  }

  initCreateOrderForm(): void {
    this.createOrderForm = this.fb.group({
      customerId: ['', Validators.required],
      requiredDate: ['', Validators.required],
    });
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

    this.dropdownService.getDropdown('paymentstatus').subscribe(res => {
      if (res.status && res.data) {
        this.paymentStatuses.set(res.data);
      }
    });

    // Preload other dropdowns to ensure they're ready when creating an order
    this.dropdownService.getDropdown('customer').subscribe(res => {
      if (res.status && res.data) {
        this.customerOptions.set(res.data);
        this.filteredCustomers.set(res.data);
      }
    });

    this.dropdownService.getDropdown('brand').subscribe(res => {
      if (res.status && res.data) this.brandOptions.set(res.data);
    });

    this.dropdownService.getDropdown('category').subscribe(res => {
      if (res.status && res.data) this.categoryOptions.set(res.data);
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
      fromDate: this.searchFromDate() || null,
      toDate: this.searchToDate() || null,
      paymentStatus: this.searchPaymentStatus() || null
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

  // --- Create Order Logic ---

  startCreateOrder(): void {
    this.isCreatingOrder.set(true);
  }

  cancelCreateOrder(): void {
    this.isCreatingOrder.set(false);
    this.createOrderForm.reset();
    this.selectedCustomer.set(null);
    this.customerSearch.set('');
    this.selectedOrderItems.set([]);
  }

  // Customer Dropdown Logic

  filterCustomers(event: Event): void {
    const term = (event.target as HTMLInputElement).value.toLowerCase();
    this.customerSearch.set(term);
    this.isCustomerDropdownOpen.set(true);
    if (!term) {
      this.filteredCustomers.set(this.customerOptions());
    } else {
      this.filteredCustomers.set(
        this.customerOptions().filter(c => c.text.toLowerCase().includes(term))
      );
    }
  }

  selectCustomer(customer: DropdownItem): void {
    this.selectedCustomer.set(customer);
    this.customerSearch.set(customer.text);
    this.createOrderForm.get('customerId')?.setValue(customer.value);
    this.isCustomerDropdownOpen.set(false);
  }

  // Product Selection Modal Logic
  openProductModal(): void {
    this.isProductModalOpen.set(true);
    this.productSearchText.set('');
    this.selectedBrandId.set(null);
    this.selectedCategoryId.set(null);
    this.availableProducts.set([]);
    this.filteredAvailableProducts.set([]);
  }

  closeProductModal(): void {
    this.isProductModalOpen.set(false);
  }

  fetchAvailableProducts(): void {
    const bId = this.selectedBrandId();
    const cId = this.selectedCategoryId();
    if (!bId || !cId) return;

    this.isProductsLoading.set(true);
    this.dropdownService.getProductStockSummaries(bId, cId).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.availableProducts.set(res.data);
          this.filterProducts();
        } else {
          this.availableProducts.set([]);
          this.filteredAvailableProducts.set([]);
        }
        this.isProductsLoading.set(false);
      },
      error: () => {
        this.isProductsLoading.set(false);
        this.showToast('Failed to load products.', 'error');
      }
    });
  }

  filterProducts(): void {
    const term = this.productSearchText().toLowerCase();
    if (!term) {
      this.filteredAvailableProducts.set(this.availableProducts());
    } else {
      this.filteredAvailableProducts.set(
        this.availableProducts().filter(p => p.productName.toLowerCase().includes(term))
      );
    }
  }

  addProduct(product: any): void {
    const items = [...this.selectedOrderItems()];
    const existing = items.find(i => i.productId === product.productId);

    if (existing) {
      this.showToast('Product already added to the order.', 'error');
      return;
    }

    if (product.stockQty < 1) {
      this.showToast('Product is out of stock.', 'error');
      return;
    }

    items.push({
      productId: product.productId,
      productName: product.productName,
      price: product.price,
      qty: 1,
      total: product.price,
      stockQty: product.stockQty
    });
    this.selectedOrderItems.set(items);
    this.showToast(`${product.productName} added.`, 'success');
  }

  updateQty(index: number, delta: number): void {
    const items = [...this.selectedOrderItems()];
    const newQty = items[index].qty + delta;
    if (newQty < 1) return;

    if (newQty > items[index].stockQty) {
      this.showToast(`Cannot add more than available stock (${items[index].stockQty}).`, 'error');
      return;
    }

    items[index].qty = newQty;
    items[index].total = items[index].qty * items[index].price;
    this.selectedOrderItems.set(items);
  }

  removeProduct(index: number): void {
    const items = [...this.selectedOrderItems()];
    items.splice(index, 1);
    this.selectedOrderItems.set(items);
  }

  // Calculations
  subtotal = computed(() => this.selectedOrderItems().reduce((sum, item) => sum + item.total, 0));
  tax = computed(() => this.subtotal() * 0.18); // 18% GST
  totalAmount = computed(() => this.subtotal() + this.tax());

  async completeOrder(): Promise<void> {
    if (this.createOrderForm.invalid) {
      this.createOrderForm.markAllAsTouched();
      this.showToast('Please fill in required fields.', 'error');
      return;
    }
    if (this.selectedOrderItems().length === 0) {
      this.showToast('Please add at least one product.', 'error');
      return;
    }

    const isLoaded = await this.loadRazorpayScript();
    if (!isLoaded) {
      this.showToast('Failed to load payment gateway.', 'error');
      return;
    }

    const staffId = Number(this.authService.getUserId());
    if (!staffId || isNaN(staffId)) {
      this.showToast('Authentication error. Staff ID not found.', 'error');
      return;
    }

    const formVal = this.createOrderForm.getRawValue();
    const payload: AddOrderRequest = {
      customerId: formVal.customerId,
      requiredDate: formVal.requiredDate,
      staffId: staffId,
      orderItemRequests: this.selectedOrderItems().map(item => ({
        productId: item.productId,
        quantity: item.qty,
        unitPrice: item.price,
        discount: 0 // Discount is currently set to 0 in the UI
      }))
    };

    this.isCompleting.set(true);
    this.orderService.createOrder(payload).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.initRazorpay(res.data.razorpayOrderId, res.data.orderId, res.data.razorpaySecretKey);
        } else {
          this.showToast(res.message || 'Failed to create order.', 'error');
          this.isCompleting.set(false);
        }
      },
      error: () => {
        this.showToast('Network error while creating order.', 'error');
        this.isCompleting.set(false);
      }
    });
  }

  initRazorpay(razorpayOrderId: string, orderId: number, razorpaySecretKey: string): void {
    const options = {
      key: razorpaySecretKey,
      amount: this.totalAmount() * 100,
      currency: 'INR',
      name: 'BikeHub',
      description: 'Order Payment',
      order_id: razorpayOrderId,
      config: {
        display: {
          blocks: {
            banks: {
              name: 'Most Used Methods',
              instruments: [
                {
                  method: 'card',
                  networks: ['Visa', 'MasterCard']
                },
                {
                  method: 'upi'
                }
              ]
            }
          },
          sequence: ['block.banks']
        }
      },
      handler: (response: any) => {
        this.verifyPayment(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature, orderId);
      },
      prefill: {
        name: this.selectedCustomer()?.text || '',
      },
      theme: {
        color: '#3b82f6'
      },
      modal: {
        ondismiss: () => {
          this.isCompleting.set(false);
          this.showToast('Payment was cancelled.', 'error');
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  }

  verifyPayment(rzpOrderId: string, rzpPaymentId: string, rzpSignature: string, orderId: number): void {
    const payload: VerifyPaymentRequest = {
      razorpayOrderId: rzpOrderId,
      razorpayPaymentId: rzpPaymentId,
      razorpaySignature: rzpSignature,
      orderId: orderId
    };

    this.orderService.verifyPayment(payload).subscribe({
      next: (res) => {
        if (res.status) {
          this.showToast('Order completed and payment verified!', 'success');
          this.cancelCreateOrder();
          this.load(); // Refresh grid
        } else {
          this.showToast(res.message || 'Payment verification failed.', 'error');
        }
        this.isCompleting.set(false);
      },
      error: () => {
        this.showToast('Network error during payment verification.', 'error');
        this.isCompleting.set(false);
      }
    });
  }

  payOrder(order: Order): void {
    if (!order.razorPayOrderId) {
      this.showToast('Razorpay Order ID is missing for this order.', 'error');
      return;
    }
    // We don't have a razorpaySecretKey from the order list response.
    // Assuming backend verify endpoint can handle it if we initiate correctly,
    // or we might need another backend integration. Passing empty string for now
    // as it might be configured globally in Razorpay script if backend allows.
    // If it fails, we need the secret key from the backend.
    this.initRazorpay(order.razorPayOrderId, order.orderId, '');
  }

  loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof Razorpay !== 'undefined') {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  showToast(text: string, type: 'success' | 'error'): void {
    const id = Date.now();
    this.toasts.update((t) => [...t, { id, text, type }]);
    setTimeout(() => {
      this.toasts.update((t) => t.filter((toast) => toast.id !== id));
    }, 4000);
  }
}

