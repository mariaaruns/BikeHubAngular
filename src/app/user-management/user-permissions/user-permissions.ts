import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService, User, Policy, UserPolicyPayload } from '../../core/services/user/user.service';

@Component({
  selector: 'app-user-permissions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-permissions.html',
  styleUrl: './user-permissions.css'
})
export class UserPermissions implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);

  userId = signal<number | null>(null);
  user = signal<User | null>(null);
  userPolicies = signal<Policy[]>([]);
  
  isLoading = signal(true);
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  toastMessage = signal<{ text: string, type: 'success' | 'error' } | null>(null);

  // Emojis mapping for logical grouping
  emojiMapping: { [key: string]: string } = {
    'PRODUCT': '📦',
    'CUSTOMER': '👥',
    'ORDER': '🛒',
    'USER': '🔐',
    'BRAND': '🏷️',
    'CATEGORY': '📁'
  };

  groupedPolicies = computed(() => {
    const policies = this.userPolicies();
    const groups: { [key: string]: Policy[] } = {};
    
    for (const policy of policies) {
      const parts = policy.code.split('_');
      const groupName = parts[0];
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(policy);
    }
    
    return Object.keys(groups).map(key => ({
      groupName: key,
      emoji: this.emojiMapping[key] || '⚙️',
      policies: groups[key]
    }));
  });

  // Initialize the component
  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.userId.set(id);
      this.loadUserDetails(id);
      this.loadPermissions(id);
    } else {
      this.errorMessage.set('Invalid User ID');
      this.isLoading.set(false);
    }
  }

  loadUserDetails(id: number): void {
    this.userService.getUserById(id).subscribe({
      next: (res: any) => {
        if (res.status && res.data) {
          this.user.set(res.data);
        }
      },
      error: () => console.error('Failed to load user info')
    });
  }

  loadPermissions(id: number): void {
    this.isLoading.set(true);
    this.userService.getUserPolicies(id).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.userPolicies.set(res.data);
        } else {
          this.errorMessage.set(res.message ?? 'Failed to load permissions.');
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Network error loading permissions.');
        this.isLoading.set(false);
      }
    });
  }

  togglePermission(policyId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.userPolicies.update(policies => 
      policies.map(p => p.policyId === policyId ? { ...p, haspermission: checked } : p)
    );
  }

  savePermissions(): void {
    const id = this.userId();
    if (!id) return;

    this.isSubmitting.set(true);
    const payload: UserPolicyPayload[] = this.userPolicies().map(p => ({
      policyId: p.policyId,
      userId: id,
      haspermission: p.haspermission
    }));

    this.userService.applyUserPolicies(id, payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.status !== false) {
          this.showToast('Permissions updated successfully.', 'success');
          setTimeout(() => this.goBack(), 1500); // Navigate back after showing toast
        } else {
          this.showToast(res.message ?? 'Failed to update permissions.', 'error');
        }
      },
      error: () => {
        this.isSubmitting.set(false);
        this.showToast('Network error updating permissions.', 'error');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/user-management']);
  }

  showToast(text: string, type: 'success' | 'error'): void {
    this.toastMessage.set({ text, type });
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }
}
