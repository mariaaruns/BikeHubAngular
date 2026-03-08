import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PagedResult } from '../../models/api-response.model';

export interface Order {
  orderId: number;
  status: string;
  totalAmount: number;
  customerName: string;
  image: string;
}

export interface OrderFilter {
  pageNumber: number;
  pageSize: number;
  orderId?: number | null;
  orderStatus?: number | null;
  startDate?: string | null;
}

export interface OrderItemDetail {
  itemId: number;
  productId: number;
  quantity: number;
  listPrice: number;
  discount: number;
  productName: string;
}

export interface OrderDetail {
  orderId: number;
  orderStatus: number;
  customerId: number;
  orderDate: string;
  requiredDate: string;
  shippedDate: string | null;
  storeId: number;
  staffId: number;
  customerName: string;
  email: string;
  phone: string;
  image: string;
  orderItems: OrderItemDetail[];
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getOrders(filter: OrderFilter): Observable<ApiResponse<PagedResult<Order>>> {
    // Strip null or undefined values to avoid backend conversion errors
    const payload = Object.fromEntries(
      Object.entries(filter).filter(([_, v]) => v != null)
    );

    return this.http.post<ApiResponse<PagedResult<Order>>>(
      `${this.baseUrl}/orders`,
      payload
    );
  }

  updateOrderStatus(payload: { orderId: number; orderStatusId: number }): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      `${this.baseUrl}/UpdateOrderStatus`,
      payload
    );
  }

  getOrderDetail(orderId: number): Observable<ApiResponse<OrderDetail>> {
    return this.http.get<ApiResponse<OrderDetail>>(
      `${this.baseUrl}/orderDetailWithItems?id=${orderId}`
    );
  }
}
