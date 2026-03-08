import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';

export interface Category {
  categoryId: number;
  categoryName: string;
}

export interface AddCategoryDto {
  categoryName: string | null;
}

export interface UpdateCategoryDto {
  categoryId: number;
  categoryName: string;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getCategory(categoryNameFilter?: string): Observable<ApiResponse<Category[]>> {
    let params = new HttpParams();
    if (categoryNameFilter) {
      params = params.set('CategoryNameFilter', categoryNameFilter);
    }
    return this.http.get<ApiResponse<Category[]>>(`${this.baseUrl}/GetCategory`, { params });
  }

  getCategoryById(id: number): Observable<ApiResponse<Category>> {
    return this.http.get<ApiResponse<Category>>(`${this.baseUrl}/GetCategoryById`, {
      params: { Id: id.toString() }
    });
  }

  addCategory(payload: AddCategoryDto): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/categoryAdd`, payload);
  }

  updateCategory(payload: UpdateCategoryDto): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(`${this.baseUrl}/UpdateCategory`, payload);
  }

  deleteCategory(id: number): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(`${this.baseUrl}/DeleteCategory`, {
      body: { id }
    });
  }
}
