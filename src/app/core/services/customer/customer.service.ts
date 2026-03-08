import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PagedResult } from '../../models/api-response.model';

export interface Customer {
  customerId: number;
  customerName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  image: string;
}

export interface CustomerDetail {
  customerId: number;
  firstName: string;
  lastName: string;
  customerName: string;
  email: string;
  phone: string | null;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  image: string;
}

export interface AddCustomerDto {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  imagebyte?: string | null;
}

export interface UpdateCustomerDto extends AddCustomerDto {
  id: number;
}

export interface CustomerFilter {
  pageNumber: number;
  pageSize: number;
  customerName: string;
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getAll(filter: CustomerFilter): Observable<ApiResponse<PagedResult<Customer>>> {
    return this.http.post<ApiResponse<PagedResult<Customer>>>(
      `${this.baseUrl}/GetAllCustomers`,
      filter
    );
  }

  getById(id: number): Observable<ApiResponse<CustomerDetail>> {
    return this.http.get<ApiResponse<CustomerDetail>>(
      `${this.baseUrl}/GetCustomerById`,
      { params: { Id: id.toString() } }
    );
  }

  addCustomer(payload: AddCustomerDto): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(
      `${this.baseUrl}/AddCustomer`,
      payload
    );
  }

  updateCustomer(payload: UpdateCustomerDto): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      `${this.baseUrl}/UpdateCustomer`,
      payload
    );
  }

  deactivateCustomer(id: number): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(
      `${this.baseUrl}/DeActivateCustomer/${id}`
    );
  }
}
