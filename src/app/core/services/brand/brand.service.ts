import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';

export interface Brand {
  brandId: number;
  brandName: string;
  image: string;
}

export interface AddBrandDto {
  brandName: string;
  imagebyte?: string | null;
}

export interface UpdateBrandDto {
  brandId: number;
  brandName: string;
  imagebyte?: string | null;
}

@Injectable({ providedIn: 'root' })
export class BrandService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getAll(brandNameFilter?: string): Observable<ApiResponse<Brand[]>> {
    let params = new HttpParams();
    if (brandNameFilter) {
      params = params.set('BrandNameFilter', brandNameFilter);
    }
    return this.http.get<ApiResponse<Brand[]>>(`${this.baseUrl}/GetAllBrand`, { params });
  }

  getById(id: number): Observable<ApiResponse<Brand>> {
    return this.http.get<ApiResponse<Brand>>(`${this.baseUrl}/getbrandById`, {
      params: { Id: id.toString() }
    });
  }

  addBrand(payload: AddBrandDto): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/AddBrand`, payload);
  }

  updateBrand(payload: UpdateBrandDto): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(`${this.baseUrl}/updateBrand`, payload);
  }

  deleteBrand(id: number): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(`${this.baseUrl}/DeleteBrandById`, { id });
  }
}
