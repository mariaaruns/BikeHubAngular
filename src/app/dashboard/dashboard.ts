import {
  Component, inject, signal, OnInit, OnDestroy,
  ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DashboardService, DashboardCount, SalesMonth
} from '../core/services/dashboard/dashboard.service';
import {
  Chart, BarController, BarElement,
  CategoryScale, LinearScale, Tooltip, Legend
} from 'chart.js';

// Register only what we need (tree-shakeable)
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  @ViewChild('salesChart', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  private dashboardService = inject(DashboardService);
  private chart: Chart | null = null;

  // Counts section
  selectedDate = signal<string>(this.getTodayDate());
  counts = signal<DashboardCount | null>(null);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // Chart section
  isChartLoading = signal(false);

  ngOnInit(): void {
    this.loadCounts();
    this.loadSalesChart();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  getSelectedYear(): number {
    return new Date(this.selectedDate()).getFullYear();
  }

  // ── Count cards ──────────────────────────────────────────────────────────

  onDateChange(date: string): void {
    this.selectedDate.set(date);
    this.loadCounts();
    this.loadSalesChart(); // year auto-derived from the date
  }

  loadCounts(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.dashboardService.getCounts(this.selectedDate()).subscribe({
      next: (res) => {
        if (res.status && res.data) this.counts.set(res.data);
        else this.errorMessage.set(res.message ?? 'Failed to load data.');
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Network error. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  // ── Sales bar chart ───────────────────────────────────────────────────────

  loadSalesChart(): void {
    this.isChartLoading.set(true);

    this.dashboardService.getSalesAmount(this.getSelectedYear()).subscribe({
      next: (res) => {
        if (res.status && res.data) this.renderChart(res.data);
        this.isChartLoading.set(false);
      },
      error: () => this.isChartLoading.set(false)
    });
  }

  renderChart(data: SalesMonth[]): void {
    const labels = data.map(d => d.month);
    const values = data.map(d => d.netAmount);

    if (this.chart) {
      // Update existing chart data without re-creating
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = values;
      this.chart.update();
      return;
    }

    const canvas = this.chartCanvas?.nativeElement;
    if (!canvas) return;  // Safety guard — canvas not yet in DOM
    const ctx = canvas.getContext('2d')!;
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Net Sales Amount (₹)',
          data: values,
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: '#3b82f6',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ₹ ${(ctx.parsed.y ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#6b7280' }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(107,114,128,0.1)' },
            ticks: {
              color: '#6b7280',
              callback: v => `₹${Number(v).toLocaleString('en-IN')}`
            }
          }
        }
      }
    });
  }
}
