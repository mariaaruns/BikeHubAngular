import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';

export interface DropdownItem {
  value: number;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class DropdownService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getDropdown(type: 'category' | 'brand' | 'orderstatus'): Observable<ApiResponse<DropdownItem[]>> {
    return this.http.get<ApiResponse<DropdownItem[]>>(`${this.baseUrl}/Dropdown`, {
      params: { type }
    });
  }
}
