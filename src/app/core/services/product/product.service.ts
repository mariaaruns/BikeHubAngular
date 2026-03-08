import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PagedResult } from '../../models/api-response.model';

export interface Product {
  productId: number;
  productName: string;
  categoryId: number;
  categoryName: string | null;
  brandId: number;
  brandName: string | null;
  modelYear: string | null;
  price: number | null;
  stock: number | null;
  productImage: string | null;
  productImageUrl: string | null;
}

export interface ProductDetail {
  productId: number;
  productName: string;
  categoryId: number;
  brandId: number;
  price: number | null;
  stock: number | null;
  productImage: string | null;
  modelYear: string;
}

export interface AddProductDto {
  productName: string;
  brandId: number;
  categoryId: number;
  modelYear: number;
  listPrice: number;
  imagebyte?: string | null;
  stockQty: number;
}

export interface UpdateProductDto extends AddProductDto {
  productId: number;
}

export interface ProductFilter {
  pageNumber: number;
  pageSize: number;
  productNameFilter?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getProducts(filter: ProductFilter): Observable<ApiResponse<PagedResult<Product>>> {
    return this.http.post<ApiResponse<PagedResult<Product>>>(
      `${this.baseUrl}/products`,
      filter
    );
  }

  getProductById(id: number): Observable<ApiResponse<ProductDetail>> {
    return this.http.get<ApiResponse<ProductDetail>>(
      `${this.baseUrl}/products/${id}`
    );
  }

  addProduct(payload: AddProductDto): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(
      `${this.baseUrl}/products/add`,
      payload
    );
  }

  updateProduct(payload: UpdateProductDto): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      `${this.baseUrl}/products/update`,
      payload
    );
  }

  deactivateProduct(id: number): Observable<ApiResponse<string>> {
    return this.http.patch<ApiResponse<string>>(
      `${this.baseUrl}/products/${id}/deactivate`,
      {}
    );
  }
}
