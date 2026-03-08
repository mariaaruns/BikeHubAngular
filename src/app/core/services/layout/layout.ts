import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  // Mobile sidebar state
  public isSidebarOpen = signal(false);

  // Desktop sidebar collapsed state
  public isSidebarCollapsed = signal(true);

  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
  }

  toggleDesktopSidebar() {
    this.isSidebarCollapsed.update(v => !v);
  }
}
