import { Component, inject, signal, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MechanicService, MechanicLiveStats, MechanicStatus, DailyJob, AssignJobPayload, AssignedJob, MechanicSummary, JobDetails, ServiceItem, PartItem, AddServiceItemPayload } from '../core/services/bike-services/mechanic.service';
import { DropdownService, DropdownItem } from '../core/services/dropdown/dropdown.service';
import { AuthService } from '../core/services/auth/auth.service';

@Component({
  selector: 'app-bike-service',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './bike-service.html',
  styleUrl: './bike-service.css',
})
export class BikeService implements OnInit, OnDestroy {
  private mechanicService = inject(MechanicService);
  private dropdownService = inject(DropdownService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  // ── Live stats ────────────────────────────────────
  liveStats = signal<MechanicLiveStats | null>(null);
  isStatsLoading = signal(false);

  // ── Mechanic list ─────────────────────────────────
  mechanics = signal<MechanicStatus[]>([]);
  isMechanicsLoading = signal(false);
  viewMode = signal<'cards' | 'table'>('cards');

  // ── Daily jobs ────────────────────────────────────
  dailyJobs = signal<DailyJob[]>([]);
  isDailyJobsLoading = signal(false);
  statusOptions = signal<DropdownItem[]>([]);
  selectedStatus = signal<string | null>(null);

  // ── Error / Toast ─────────────────────────────────
  errorMessage = signal<string | null>(null);
  toastMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  // ── Assign Job Drawer ─────────────────────────────
  isDrawerOpen = signal(false);
  isDrawerSubmitting = signal(false);
  drawerMechanic = signal<MechanicStatus | null>(null);

  // ── View Jobs Modal ───────────────────────────────
  isJobsModalOpen = signal(false);
  isJobsLoading = signal(false);
  jobsMechanic = signal<MechanicStatus | null>(null);
  assignedJobs = signal<AssignedJob[]>([]);

  // Customer dropdown (searchable)
  customerOptions = signal<DropdownItem[]>([]);
  customerSearch = signal('');
  filteredCustomers = signal<DropdownItem[]>([]);
  isCustomerDropdownOpen = signal(false);
  selectedCustomer = signal<DropdownItem | null>(null);

  // ── Mechanic specific view ────────────────────────
  userRole = signal<string | null>(null);
  mechanicSummary = signal<MechanicSummary | null>(null);
  isMechanicSummaryLoading = signal(false);
  mechanicJobs = signal<AssignedJob[]>([]);
  isMechanicJobsLoading = signal(false);
  activeTab = signal<'Pending' | 'Inprogress' | 'Completed'>('Pending');

  // Mechanic Job Details Modal
  isJobDetailsModalOpen = signal(false);
  jobDetailsLoading = signal(false);
  selectedJobDetails = signal<JobDetails | null>(null);

  // Parts Modal
  isPartsModalOpen = signal(false);
  isPartsLoading = signal(false);
  serviceItems = signal<ServiceItem[]>([]);
  selectedPartsJobId = signal<number | null>(null);

  partsForm!: FormGroup;
  allParts = signal<PartItem[]>([]);
  filteredParts = signal<PartItem[]>([]);
  partCategories = signal<DropdownItem[]>([]);
  isAddingPart = signal(false);

  assignForm!: FormGroup;

  currentTime = signal<Date>(new Date());
  private timerId: any;

  ngOnInit(): void {
    const role = this.authService.getUserRole();
    this.userRole.set(role);

    if (this.isMechanic()) {
      this.loadMechanicViewData();
      this.initPartsForm();
      this.timerId = setInterval(() => this.currentTime.set(new Date()), 1000);
    } else {
      this.loadStats();
      this.loadMechanics();
      this.loadStatusDropdown();
      this.initAssignForm();
      this.loadCustomers();
    }
  }

  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
  }

  isAdminOrStaff(): boolean {
    const r = this.userRole();
    return r === 'ADMIN' || r === 'STAFF' || r === 'Manager'; // Adding Manager just in case
  }

  isMechanic(): boolean {
    return this.userRole() === 'MECHANIC';
  }

  loadMechanicViewData(): void {
    const userId = Number(this.authService.getUserId());
    if (!userId) return;

    // Load Summary
    this.isMechanicSummaryLoading.set(true);
    this.mechanicService.getMechanicSummary(userId).subscribe({
      next: (res) => {
        if (res.status && res.data) this.mechanicSummary.set(res.data);
        this.isMechanicSummaryLoading.set(false);
      },
      error: () => this.isMechanicSummaryLoading.set(false)
    });

    // Load Jobs
    this.isMechanicJobsLoading.set(true);
    this.mechanicService.getAssignedJobs(userId).subscribe({
      next: (res) => {
        if (res.status && res.data) this.mechanicJobs.set(res.data);
        this.isMechanicJobsLoading.set(false);
      },
      error: () => this.isMechanicJobsLoading.set(false)
    });
  }

  setActiveTab(tab: 'Pending' | 'Inprogress' | 'Completed'): void {
    this.activeTab.set(tab);
  }

  getFilteredMechanicJobs(): AssignedJob[] {
    const tab = this.activeTab();
    return this.mechanicJobs().filter(j => j.serviceStatus === tab);
  }

  getTabCount(tab: string): number {
    return this.mechanicJobs().filter(j => j.serviceStatus === tab).length;
  }

  initAssignForm(): void {
    this.assignForm = this.fb.group({
      bikeModel: ['', Validators.required],
      bikeNumber: ['', Validators.required],
      problemDescription: ['', Validators.required],
      estimatedCost: [null, [Validators.required, Validators.min(0)]],
      finalCost: [null, [Validators.required, Validators.min(0)]],
      durationHours: [0, [Validators.required, Validators.min(0)]],
      durationMinutes: [0, [Validators.required, Validators.min(0), Validators.max(59)]],
    });
  }

  initPartsForm(): void {
    this.partsForm = this.fb.group({
      categoryId: ['', Validators.required],
      partId: [{value: '', disabled: true}, Validators.required],
      qty: [1, [Validators.required, Validators.min(1)]],
      total: [{value: 0, disabled: true}, Validators.required]
    });

    this.partsForm.get('categoryId')?.valueChanges.subscribe(catId => {
      if (catId) {
        this.filteredParts.set(this.allParts().filter(p => p.categoryId == catId));
        this.partsForm.get('partId')?.enable();
        this.partsForm.get('partId')?.setValue('');
        this.partsForm.get('qty')?.setValue(1);
        this.partsForm.get('total')?.setValue(0);
      } else {
        this.filteredParts.set([]);
        this.partsForm.get('partId')?.disable();
        this.partsForm.get('partId')?.setValue('');
      }
    });

    this.partsForm.get('partId')?.valueChanges.subscribe(partId => {
      if (partId) {
        const part = this.allParts().find(p => p.partId == partId);
        if (part) {
          const qty = this.partsForm.get('qty')?.value || 1;
          this.partsForm.get('qty')?.setValue(qty);
          this.partsForm.get('total')?.setValue(part.price * qty);
        }
      }
    });

    this.partsForm.get('qty')?.valueChanges.subscribe(qty => {
      const partId = this.partsForm.get('partId')?.value;
      if (partId && qty) {
        const part = this.allParts().find(p => p.partId == partId);
        if (part) {
          this.partsForm.get('total')?.setValue(part.price * qty);
        }
      }
    });
  }

  loadPartsData(): void {
    if (this.partCategories().length === 0) {
      this.dropdownService.getDropdown('servicepartscategory').subscribe(res => {
        if (res.status && res.data) this.partCategories.set(res.data);
      });
    }
    if (this.allParts().length === 0) {
      this.mechanicService.getAllParts().subscribe(res => {
        if (res.status && res.data) this.allParts.set(res.data);
      });
    }
  }

  submitAddPart(): void {
    if (this.partsForm.invalid) {
      this.partsForm.markAllAsTouched();
      return;
    }

    const fv = this.partsForm.getRawValue();
    const payload: AddServiceItemPayload = {
      serviceJobId: this.selectedPartsJobId()!,
      partId: Number(fv.partId),
      qty: Number(fv.qty),
      total: Number(fv.total),
      createdAt: new Date().toISOString()
    };

    this.isAddingPart.set(true);
    this.mechanicService.addServiceItem(payload).subscribe({
      next: (res) => {
        this.isAddingPart.set(false);
        if (res.status) {
          this.showToast('Part added successfully!', 'success');
          this.partsForm.reset({ categoryId: '', partId: '', qty: 1, total: 0 });
          this.partsForm.get('partId')?.disable();
          this.openPartsModal(this.selectedPartsJobId()!); // Refresh list
        } else {
          this.showToast(res.message || 'Failed to add part.', 'error');
        }
      },
      error: () => {
        this.isAddingPart.set(false);
        this.showToast('Network error while adding part.', 'error');
      }
    });
  }

  /** Total minutes from hours + minutes inputs */
  totalMinutes(): number {
    const h = Number(this.assignForm.get('durationHours')?.value) || 0;
    const m = Number(this.assignForm.get('durationMinutes')?.value) || 0;
    return h * 60 + m;
  }

  // ── Stats ──────────────────────────────────────────
  loadStats(): void {
    this.isStatsLoading.set(true);
    this.mechanicService.getLiveStats().subscribe({
      next: (res) => {
        if (res.status && res.data) this.liveStats.set(res.data);
        this.isStatsLoading.set(false);
      },
      error: () => { this.errorMessage.set('Failed to load live stats.'); this.isStatsLoading.set(false); }
    });
  }

  // ── Mechanics ──────────────────────────────────────
  loadMechanics(): void {
    this.isMechanicsLoading.set(true);
    this.mechanicService.getAllMechanicStatus().subscribe({
      next: (res) => {
        if (res.status && res.data) this.mechanics.set(res.data);
        this.isMechanicsLoading.set(false);
      },
      error: () => { this.errorMessage.set('Failed to load mechanic status.'); this.isMechanicsLoading.set(false); }
    });
  }

  setView(mode: 'cards' | 'table'): void { this.viewMode.set(mode); }

  // ── Status dropdown / Daily Jobs ───────────────────
  loadStatusDropdown(): void {
    this.dropdownService.getDropdown('servicestatus').subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.statusOptions.set(res.data);
          this.selectedStatus.set(null);
        }
        this.loadDailyJobs();
      },
      error: () => this.loadDailyJobs()
    });
  }

  loadDailyJobs(): void {
    this.isDailyJobsLoading.set(true);
    this.mechanicService.getDailyJobs(this.selectedStatus()).subscribe({
      next: (res) => {
        this.dailyJobs.set(res.status && res.data ? res.data : []);
        this.isDailyJobsLoading.set(false);
      },
      error: () => { this.dailyJobs.set([]); this.isDailyJobsLoading.set(false); }
    });
  }

  onStatusChange(value: string): void {
    this.selectedStatus.set(value === '' ? null : value);
    this.loadDailyJobs();
  }

  // ── Customer dropdown ──────────────────────────────
  loadCustomers(): void {
    this.dropdownService.getDropdown('customer').subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.customerOptions.set(res.data);
          this.filteredCustomers.set(res.data);
        }
      },
      error: () => { }
    });
  }

  onCustomerSearch(query: string): void {
    this.customerSearch.set(query);
    const q = query.toLowerCase();
    this.filteredCustomers.set(
      this.customerOptions().filter(c => c.text.toLowerCase().includes(q))
    );
    this.isCustomerDropdownOpen.set(true);
    this.selectedCustomer.set(null);
  }

  selectCustomer(customer: DropdownItem): void {
    this.selectedCustomer.set(customer);
    this.customerSearch.set(customer.text);
    this.isCustomerDropdownOpen.set(false);
  }

  closeCustomerDropdown(): void {
    setTimeout(() => this.isCustomerDropdownOpen.set(false), 150);
  }

  // ── Assign Job Drawer ──────────────────────────────
  openAssignDrawer(mechanic: MechanicStatus): void {
    this.drawerMechanic.set(mechanic);
    this.assignForm.reset();
    this.selectedCustomer.set(null);
    this.customerSearch.set('');
    this.filteredCustomers.set(this.customerOptions());
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.drawerMechanic.set(null);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isDrawerOpen()) this.closeDrawer();
    if (this.isJobsModalOpen()) this.closeViewJobs();
    if (this.isPartsModalOpen()) this.closePartsModal();
  }

  // ── View Jobs Modal ────────────────────────────────
  openViewJobs(mechanic: MechanicStatus): void {
    this.jobsMechanic.set(mechanic);
    this.assignedJobs.set([]);
    this.isJobsModalOpen.set(true);
    this.isJobsLoading.set(true);
    this.mechanicService.getAssignedJobs(mechanic.mechanicId).subscribe({
      next: (res) => {
        this.assignedJobs.set(res.status && res.data ? res.data : []);
        this.isJobsLoading.set(false);
      },
      error: () => {
        this.assignedJobs.set([]);
        this.isJobsLoading.set(false);
      }
    });
  }

  closeViewJobs(): void {
    this.isJobsModalOpen.set(false);
    this.jobsMechanic.set(null);
    this.assignedJobs.set([]);
  }

  submitAssign(): void {
    if (this.assignForm.invalid) { this.assignForm.markAllAsTouched(); return; }
    if (!this.selectedCustomer()) { this.showToast('Please select a customer.', 'error'); return; }
    if (this.totalMinutes() < 1) { this.showToast('Duration must be at least 1 minute.', 'error'); return; }

    const userId = Number(this.authService.getUserId()) || 0;
    const mechanic = this.drawerMechanic()!;
    const now = new Date().toISOString();
    const fv = this.assignForm.value;

    const payload: AssignJobPayload = {
      customerId: this.selectedCustomer()!.value,
      bikeModel: fv.bikeModel,
      bikeNumber: fv.bikeNumber,
      problemDescription: fv.problemDescription,
      estimatedCost: Number(fv.estimatedCost),
      finalCost: Number(fv.finalCost),
      estimatedDuration: this.totalMinutes(),
      createdBy: userId,
      createdDate: now,
      mechanicId: mechanic.mechanicId,
      assignedDate: now,
      assignmentStatus: 0,
      assignedBy: userId,
    };

    this.isDrawerSubmitting.set(true);
    this.mechanicService.assignJob(payload).subscribe({
      next: (res) => {
        this.isDrawerSubmitting.set(false);
        if (res.status) {
          this.showToast('Job assigned successfully!', 'success');
          this.closeDrawer();
          this.loadMechanics();
          this.loadDailyJobs();
          this.loadStats();
        } else {
          this.showToast(res.message ?? 'Failed to assign job.', 'error');
        }
      },
      error: () => {
        this.isDrawerSubmitting.set(false);
        this.showToast('Network error. Please try again.', 'error');
      }
    });
  }

  // ── Helpers ────────────────────────────────────────
  getElapsedTime(startTime: string): string {
    if (!startTime) return '00:00:00';
    const start = new Date(startTime).getTime();
    const now = this.currentTime().getTime();
    const diff = Math.floor(Math.max(0, now - start) / 1000);

    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  getStatusLabel(workload: number, active: number): string {
    if (active === 0 && workload === 0) return 'Available';
    if (workload >= 100) return 'Overloaded';
    if (workload >= 40) return 'Busy';
    return 'Available';
  }

  getStatusClass(workload: number, active: number): string {
    if (active === 0 && workload === 0) return 'status-available';
    if (workload >= 100) return 'status-overloaded';
    if (workload >= 40) return 'status-busy';
    return 'status-available';
  }

  getWorkloadClass(workload: number): string {
    if (workload >= 80) return 'bar-red';
    if (workload >= 40) return 'bar-orange';
    return 'bar-green';
  }

  getJobStatusClass(status: string | null): string {
    if (!status) return 'job-status-default';
    const s = status.toLowerCase();
    if (s.includes('complet') || s.includes('done')) return 'job-status-done';
    if (s.includes('progress') || s.includes('active')) return 'job-status-active';
    if (s.includes('pending') || s.includes('wait')) return 'job-status-pending';
    if (s.includes('cancel')) return 'job-status-cancelled';
    return 'job-status-default';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  showToast(text: string, type: 'success' | 'error'): void {
    this.toastMessage.set({ text, type });
    setTimeout(() => this.toastMessage.set(null), 3500);
  }

  isLoading(): boolean { return this.isStatsLoading() || this.isMechanicsLoading(); }

  // ── Mechanic View Actions ────────────────────────
  startJob(jobId: number): void {
    if (!jobId) {
      this.showToast('Invalid Job ID.', 'error');
      return;
    }

    this.mechanicService.startJob(jobId).subscribe({
      next: (res) => {
        if (res.status) {
          this.showToast('Job started successfully!', 'success');
          this.loadMechanicViewData();
        } else {
          this.showToast(res.message || 'Failed to start job.', 'error');
        }
      },
      error: () => this.showToast('Network error while starting job.', 'error')
    });
  }

  markCompleted(jobId: number): void {
    if (!jobId) {
      this.showToast('Invalid Job ID.', 'error');
      return;
    }
    this.mechanicService.completeJob(jobId).subscribe({
      next: (res) => {
        if (res.status) {
          this.showToast('Job marked as completed!', 'success');
          this.loadMechanicViewData();
        } else {
          this.showToast(res.message || 'Failed to complete job.', 'error');
        }
      },
      error: () => this.showToast('Network error while completing job.', 'error')
    });
  }

  openJobDetails(jobId: number): void {
    if (!jobId) return;
    this.isJobDetailsModalOpen.set(true);
    this.jobDetailsLoading.set(true);
    this.selectedJobDetails.set(null);
    this.mechanicService.getJobDetails(jobId).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.selectedJobDetails.set(res.data);
        } else {
          this.showToast(res.message || 'Failed to load details.', 'error');
          this.closeJobDetails();
        }
        this.jobDetailsLoading.set(false);
      },
      error: () => {
        this.showToast('Network error loading details.', 'error');
        this.closeJobDetails();
      }
    });
  }

  closeJobDetails(): void {
    this.isJobDetailsModalOpen.set(false);
    this.selectedJobDetails.set(null);
  }

  openPartsModal(jobId: number): void {
    if (!jobId) return;
    this.selectedPartsJobId.set(jobId);
    this.isPartsModalOpen.set(true);
    this.isPartsLoading.set(true);
    this.serviceItems.set([]);
    this.loadPartsData();
    this.partsForm.reset({ categoryId: '', partId: '', qty: 1, total: 0 });
    this.partsForm.get('partId')?.disable();

    this.mechanicService.getServiceItems(jobId).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.serviceItems.set(res.data);
        } else {
          this.serviceItems.set([]);
        }
        this.isPartsLoading.set(false);
      },
      error: () => {
        this.showToast('Network error loading service items.', 'error');
        this.serviceItems.set([]);
        this.isPartsLoading.set(false);
      }
    });
  }

  closePartsModal(): void {
    this.isPartsModalOpen.set(false);
    this.selectedPartsJobId.set(null);
    this.serviceItems.set([]);
  }

  get f() { return this.assignForm.controls; }
}
