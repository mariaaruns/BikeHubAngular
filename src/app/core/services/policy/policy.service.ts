import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { AuthService } from '../auth/auth.service';

export interface UserPolicy {
  policyName: string;
  isAllowed: boolean;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'  // Singleton — one instance across the entire app
})
export class PolicyService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private baseUrl = environment.apiUrl;

  // In-memory store — NOT persisted to localStorage
  private policies = signal<UserPolicy[]>([]);
  public isLoaded = signal(false);

  /**
   * Called once at app startup via APP_INITIALIZER.
   * Skipped if user is not logged in.
   */
  async loadPolicies(): Promise<void> {
    if (!this.authService.isLoggedIn()) {
      return; // Not logged in — skip
    }

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<UserPolicy[]>>(`${this.baseUrl}/userPolicyCached`)
      );

      if (response.status && response.data) {
        this.policies.set(response.data);
        this.isLoaded.set(true);
      }
    } catch (err) {
      console.error('Failed to load user policies', err);
    }
  }

  /** Check if the user has a specific policy */
  hasPolicy(policyName: string): boolean {
    return this.policies().some(
      p => p.policyName === policyName && p.isAllowed
    );
  }

  /** Get all loaded policies */
  getPolicies(): UserPolicy[] {
    return this.policies();
  }

  /** Clear policies on logout */
  clearPolicies(): void {
    this.policies.set([]);
    this.isLoaded.set(false);
  }
}
