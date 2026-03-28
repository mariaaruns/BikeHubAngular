import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';

export interface MechanicLiveStats {
  totalMechanics: number;
  jobsToday: number;
  busyMechanics: number;
  availableMechanics: number;
  overloadedMechanics: number;
}

export interface MechanicStatus {
  mechanicId: number;
  mechanic: string;
  pending: number;
  active: number;
  done: number;
  workload: number;
  currentJob: string | null;
}

export interface DailyJob {
  serviceJobId: number;
  mechanic: string;
  jobId: string;
  service: string | null;
  customerName: string | null;
  status: string | null;
  createdAt: string;
}


export interface MechanicSummary {
  pending: number;
  inProgress: number;
  doneToday: number;
  thisMonth: number;
}

export interface AssignedJob {
  serviceJobId: number;
  jobCardNumber: string;
  serviceStatus: string;
  problemDescription: string;
  bikeModel: string;
  customerName: string;
  createdDate: string;
  completedDate: string | null;
  isCompleted: boolean;
  startTime: string;
  estimatedDuration: number;
  actualDuration: number;
}

export interface JobDetails {
  serviceJobId: number;
  jobId: string;
  mechanic: string;
  service: string;
  customerName: string;
  status: string;
  createdAt: string;
  bikeModel: string;
  bikeNumber: string;
  completedDate: string | null;
  estimatedCost: number | null;
  finalCost: number | null;
  createdBy: string;
  assignedDate: string | null;
  email: string;
  startTime: string | null;
  estimatedDuration: number;
  address: string;
}

export interface AssignJobPayload {
  customerId: number;
  bikeModel: string;
  bikeNumber: string;
  problemDescription: string;
  estimatedCost: number;
  finalCost: number;
  createdBy: number;
  createdDate: string;
  mechanicId: number;
  assignedDate: string;
  assignmentStatus: number;
  assignedBy: number;
  estimatedDuration: number;
}



@Injectable({ providedIn: 'root' })
export class MechanicService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getLiveStats(): Observable<ApiResponse<MechanicLiveStats>> {
    return this.http.get<ApiResponse<MechanicLiveStats>>(
      `${this.baseUrl}/services/mechanic/live-stats`
    );
  }

  getAllMechanicStatus(): Observable<ApiResponse<MechanicStatus[]>> {
    return this.http.get<ApiResponse<MechanicStatus[]>>(
      `${this.baseUrl}/services/mechanic/status`
    );
  }

  getDailyJobs(serviceStatus: string | null): Observable<ApiResponse<DailyJob[]>> {
    const params: Record<string, string> = {};
    if (serviceStatus !== null && serviceStatus !== '') {
      params['serviceStatus'] = serviceStatus;
    }
    return this.http.get<ApiResponse<DailyJob[]>>(
      `${this.baseUrl}/services/daily-jobs`,
      { params }
    );
  }

  assignJob(payload: AssignJobPayload): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(
      `${this.baseUrl}/services/new-job`,
      payload
    );
  }

  getAssignedJobs(mechanicId: number): Observable<ApiResponse<AssignedJob[]>> {
    return this.http.get<ApiResponse<AssignedJob[]>>(
      `${this.baseUrl}/services/mechanic/assigned-jobs/${mechanicId}`
    );
  }

  getMechanicSummary(mechanicId: number): Observable<ApiResponse<MechanicSummary>> {
    return this.http.get<ApiResponse<MechanicSummary>>(
      `${this.baseUrl}/services/mechanic/summary/${mechanicId}`
    );
  }

  startJob(jobId: number): Observable<ApiResponse<string>> {
    return this.http.patch<ApiResponse<string>>(
      `${this.baseUrl}/services/start-job/${jobId}`,
      {}
    );
  }

  getJobDetails(jobId: number): Observable<ApiResponse<JobDetails>> {
    return this.http.get<ApiResponse<JobDetails>>(`${this.baseUrl}/services/job/${jobId}`);
  }

  completeJob(jobId: number): Observable<ApiResponse<string>> {
    return this.http.patch<ApiResponse<string>>(`${this.baseUrl}/services/complete-job/${jobId}`, {});
  }
}
