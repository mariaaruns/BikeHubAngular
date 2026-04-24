import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReportsService } from './reports.service';
import { environment } from '../../environments/environment';

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiresDates: boolean;
  requiresMonth: boolean;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css']
})
export class ReportsComponent {
  private reportsService = inject(ReportsService);
  private fb = inject(FormBuilder);

  reportsList: ReportDefinition[] = [
    { id: 'CustomerOrderRevenue', name: 'Revenue Report', description: 'Earnings & fees', icon: '💰', requiresDates: true, requiresMonth: false },
    { id: 'TopProductsByRevenue', name: 'Top Products', description: 'Product sales & revenue', icon: '🏆', requiresDates: true, requiresMonth: false },
    { id: 'Inventory', name: 'Inventory', description: 'Current stock levels', icon: '📦', requiresDates: false, requiresMonth: false },
    { id: 'BikeServiceJobs', name: 'Maintenance Log', description: 'Service records', icon: '🛠️', requiresDates: true, requiresMonth: false },
    { id: 'MechanicProductivity', name: 'Mechanic Insights', description: 'User analytics', icon: '👤', requiresDates: false, requiresMonth: true }
  ];

  selectedReport: ReportDefinition = this.reportsList[0];
  
  reportForm: FormGroup = this.fb.group({
    fromDate: ['', Validators.required],
    toDate: ['', Validators.required],
    month: ['']
  });

  isLoading = false;

  selectReport(report: ReportDefinition) {
    this.selectedReport = report;
    
    // Reset validators based on the selected report
    if (report.requiresDates) {
      this.reportForm.get('fromDate')?.setValidators([Validators.required]);
      this.reportForm.get('toDate')?.setValidators([Validators.required]);
      this.reportForm.get('month')?.clearValidators();
    } else if (report.requiresMonth) {
      this.reportForm.get('month')?.setValidators([Validators.required]);
      this.reportForm.get('fromDate')?.clearValidators();
      this.reportForm.get('toDate')?.clearValidators();
    } else {
      this.reportForm.get('fromDate')?.clearValidators();
      this.reportForm.get('toDate')?.clearValidators();
      this.reportForm.get('month')?.clearValidators();
    }

    this.reportForm.get('fromDate')?.updateValueAndValidity();
    this.reportForm.get('toDate')?.updateValueAndValidity();
    this.reportForm.get('month')?.updateValueAndValidity();
    this.reportForm.reset();
  }

  generateReport() {
    if (this.reportForm.invalid && (this.selectedReport.requiresDates || this.selectedReport.requiresMonth)) {
      this.reportForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const { fromDate, toDate, month } = this.reportForm.value;

    let requestObservable;

    switch (this.selectedReport.id) {
      case 'CustomerOrderRevenue':
        requestObservable = this.reportsService.getOrdersRevenue(fromDate, toDate);
        break;
      case 'TopProductsByRevenue':
        requestObservable = this.reportsService.getTopProductsRevenue(fromDate, toDate);
        break;
      case 'Inventory':
        requestObservable = this.reportsService.getInventory();
        break;
      case 'BikeServiceJobs':
        requestObservable = this.reportsService.getBikeServiceJobs(fromDate, toDate);
        break;
      case 'MechanicProductivity':
        requestObservable = this.reportsService.getMechanicProductivity(month);
        break;
    }

    if (requestObservable) {
      requestObservable.subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.status && response.data) {
            this.downloadFile(response.data);
          } else {
            console.error('Report generation failed', response.message);
            // Optionally add a toast service here
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error generating report', error);
        }
      });
    }
  }

  downloadFile(filePath: string) {
    const url = `${environment.baseUrl}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop() || 'report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
