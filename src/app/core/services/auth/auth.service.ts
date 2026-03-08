import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../../models/api-response.model';
import { jwtDecode } from "jwt-decode";
export interface LoginPayload {
  email: string;
  password?: string;
}

export interface LoginData {
  token: string;
  expires: string;
  email: string;
  name: string;
  profileImage: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  login(payload: LoginPayload): Observable<ApiResponse<LoginData>> {
    return this.http.post<ApiResponse<LoginData>>(`${this.baseUrl}/user/login`, payload).pipe(
      tap(response => {
        if (response.status && response.data?.token) {
          localStorage.setItem('auth_token', response.data.token);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('auth_token');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  getToken(): string | null {
    return localStorage.getItem("auth_token");
  }

  getUserId(): string | null {

    const token = this.getToken();

    if (!token) return null;

    const decoded: any = jwtDecode(token);

    return decoded.sub;
  }

  getUserFullName(): string | null {
    const token = this.getToken();
    if (!token) return null;
    const decoded: any = jwtDecode(token);

    return decoded.name;
  }
  getUserRole(): string | null {
    const token = this.getToken();
    if (!token) return null;
    const decoded: any = jwtDecode(token);
    // .NET uses either 'role' or the long URN-based claim name
    return decoded['role']
      ?? decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
      ?? null;
  }

  getUserEmail(): string | null {

    const token = this.getToken();

    if (!token) return null;

    const decoded: any = jwtDecode(token);

    return decoded.email;
  }

  getUserProfileImage(): string | null {
    const token = this.getToken();
    if (!token) return null;
    const decoded: any = jwtDecode(token);
    return decoded.profileImage;
  }

}
