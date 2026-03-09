import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PagedResult } from '../../models/api-response.model';

export interface User {
  userId: number;
  firstName: string;
  lastName: string;
  fullName: string | null;
  phoneNumber: string;
  password?: string | null;
  userName: string;
  roleName: string;
  image: string | null;
}

export interface Role {
  value: number;
  text: string;
}

export interface UserFilter {
  pageNumber: number;
  pageSize: number;
  searchName: string;
  searchRole: string;
}

export interface AddUserDto {
  firstName: string;
  lastName: string;
  userName: string;
  password?: string;
  roleId: number;
  phoneNumber: string;
  imagebyte?: string | null;
}

export interface UpdateUserDto {
  userId: number;
  firstName: string;
  lastName: string;
  roleId: number;
  phoneNumber: string;
  imagebyte?: string | null;
}

export interface Policy {
  policyId: number;
  code: string;
  description: string;
  haspermission: boolean;
}

export interface UserPolicyPayload {
  policyId: number;
  userId: number;
  haspermission: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getUsers(filter: UserFilter): Observable<ApiResponse<PagedResult<User>>> {
    return this.http.post<ApiResponse<PagedResult<User>>>(
      `${this.baseUrl}/users`,
      filter
    );
  }

  getRoles(): Observable<ApiResponse<Role[]>> {
    return this.http.get<ApiResponse<Role[]>>(
      `${this.baseUrl}/roles`
    );
  }

  getUserById(id: number): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(
      `${this.baseUrl}/user/${id}`
    );
  }

  addUser(payload: AddUserDto): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(
      `${this.baseUrl}/user/register`,
      payload
    );
  }

  updateUser(payload: UpdateUserDto): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(
      `${this.baseUrl}/user/update`,
      payload
    );
  }

  deleteUser(id: number): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(
      `${this.baseUrl}/DeleteUser/${id}`
    );
  }

  getUserPolicies(userId: number): Observable<ApiResponse<Policy[]>> {
    return this.http.get<ApiResponse<Policy[]>>(
      `${this.baseUrl}/userPolicy/${userId}`
    );
  }

  applyUserPolicies(userId: number, payload: UserPolicyPayload[]): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.baseUrl}/userPolicy/${userId}/ApplyPolicy`,
      payload
    );
  }
}
