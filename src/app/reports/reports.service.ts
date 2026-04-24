import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../core/models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private apiUrl = environment.apiUrl + '/reports';

  constructor(private http: HttpClient) {}

  getOrdersRevenue(fromDate: string, toDate: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/ordersRevenue`, { fromDate, toDate });
  }

  getTopProductsRevenue(fromDate: string, toDate: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/productRevenue`, { fromDate, toDate });
  }

  getInventory(): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/inventory`, {});
  }

  getBikeServiceJobs(fromDate: string, toDate: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/bikeService`, { fromDate, toDate });
  }

  getMechanicProductivity(month: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/mechanicProductivity`, { month });
  }
}
