import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';

export interface DashboardCount {
  totalProductsCount: number;
  totalOrdersCount: number;
  totalServiceCount: number;
  pendingServiceCount: number;
  completedServiceCount: number;
}

export interface SalesMonth {
  month: string;
  netAmount: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getCounts(date: string): Observable<ApiResponse<DashboardCount>> {
    return this.http.get<ApiResponse<DashboardCount>>(
      `${this.baseUrl}/getcount`,
      { params: { date } }
    );
  }

  getSalesAmount(year: number): Observable<ApiResponse<SalesMonth[]>> {
    return this.http.get<ApiResponse<SalesMonth[]>>(
      `${this.baseUrl}/dashboardSalesAmount`,
      { params: { year: year.toString() } }
    );
  }
}
