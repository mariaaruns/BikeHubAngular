import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';

export interface DropdownItem {
  value: number;
  text: string;
}

export interface productStockSummaries {
  productId: number;
  productName: string;
  stockQty: number;
  price: number;
}

@Injectable({ providedIn: 'root' })
export class DropdownService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getDropdown(type: 'category' | 'brand' | 'orderstatus' | 'servicestatus' | 'customer' | 'servicepartscategory' | 'paymentstatus'): Observable<ApiResponse<DropdownItem[]>> {
    return this.http.get<ApiResponse<DropdownItem[]>>(`${this.baseUrl}/Dropdown`, {
      params: { type }
    });
  }

  getProductStockSummaries(brandId: number, categoryId: number): Observable<ApiResponse<productStockSummaries[]>> {
    return this.http.get<ApiResponse<productStockSummaries[]>>(`${this.baseUrl}/products/stock-summaries`, {
      params: { brandId, categoryId }
    });
  }
}
