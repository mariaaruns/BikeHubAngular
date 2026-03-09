import {
  Component, inject, signal, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DashboardService, DashboardCount, SalesMonth, BrandSales
} from '../core/services/dashboard/dashboard.service';
import { DropdownService, DropdownItem } from '../core/services/dropdown/dropdown.service';
import {
  Chart, BarController, BarElement, ArcElement, DoughnutController,
  CategoryScale, LinearScale, Tooltip, Legend
} from 'chart.js';

// Register only what we need (tree-shakeable)
Chart.register(BarController, BarElement, ArcElement, DoughnutController, CategoryScale, LinearScale, Tooltip, Legend);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('salesChart', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  @ViewChild('doughnutChart', { static: false }) doughnutCanvas!: ElementRef<HTMLCanvasElement>;

  private dashboardService = inject(DashboardService);
  private dropdownService = inject(DropdownService);
  private barChartInstance: Chart | null = null;
  private doughnutChartInstance: Chart | null = null;

  // Counts section
  selectedDate = signal<string>(this.getTodayDate());
  counts = signal<DashboardCount | null>(null);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // Chart section
  isChartLoading = signal(false);
  isDoughnutLoading = signal(false);
  
  // Dropdown section
  orderStatuses = signal<DropdownItem[]>([]);
  selectedOrderStatus = signal<number | null>(null);

  // Pending data to render once AfterViewInit fires
  private pendingDoughnutData: BrandSales[] | null = null;
  private viewInitialized = false;

  ngOnInit(): void {
    this.loadCounts();
    this.loadSalesChart();
    this.loadOrderStatuses();
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    // If data arrived before the canvas was in the DOM, render it now.
    if (this.pendingDoughnutData !== null) {
      this.renderDoughnutChart(this.pendingDoughnutData);
      this.pendingDoughnutData = null;
    }
  }

  ngOnDestroy(): void {
    this.barChartInstance?.destroy();
    this.doughnutChartInstance?.destroy();
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
    this.loadDoughnutChart();
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

    if (this.barChartInstance) {
      // Update existing chart data without re-creating
      this.barChartInstance.data.labels = labels;
      this.barChartInstance.data.datasets[0].data = values;
      this.barChartInstance.update();
      return;
    }

    const canvas = this.chartCanvas?.nativeElement;
    if (!canvas) return;  // Safety guard — canvas not yet in DOM
    const ctx = canvas.getContext('2d')!;
    this.barChartInstance = new Chart(ctx, {
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

  // ── Doughnut chart & Dropdowns ──────────────────────────────────────────

  loadOrderStatuses(): void {
    this.dropdownService.getDropdown('orderstatus').subscribe({
      next: (res) => {
        if (res.status && res.data && res.data.length > 0) {
          this.orderStatuses.set(res.data);
          // Auto-select the first status
          this.selectedOrderStatus.set(res.data[0].value);
          this.loadDoughnutChart();
        }
      },
      error: () => console.error("Failed to load order statuses")
    });
  }

  onOrderStatusChange(statusId: number): void {
    this.selectedOrderStatus.set(Number(statusId));
    this.loadDoughnutChart();
  }

  loadDoughnutChart(): void {
    const status = this.selectedOrderStatus();
    if (status === null) return;

    this.isDoughnutLoading.set(true);

    this.dashboardService.getBrandYearlySales(this.getSelectedYear(), status).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.renderDoughnutChart(res.data);
        } else {
           // Handle empty data cleanly by clearing the chart
           this.renderDoughnutChart([]);
        }
        this.isDoughnutLoading.set(false);
      },
      error: () => this.isDoughnutLoading.set(false)
    });
  }

  renderDoughnutChart(data: BrandSales[]): void {
    // If the view hasn't initialized yet (canvas not in DOM), defer render
    if (!this.viewInitialized) {
      this.pendingDoughnutData = data;
      return;
    }

    const canvas = this.doughnutCanvas?.nativeElement;
    if (!canvas) return;

    const labels = data.map(d => d.Brand ?? d.brand ?? 'Unknown');
    const values = data.map(d => d.NetAmount ?? d.netAmount ?? 0);

    const bgColors = [
      '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#d946ef'
    ];

    if (this.doughnutChartInstance) {
      if (data.length === 0) {
        this.doughnutChartInstance.data.labels = ['No Data'];
        this.doughnutChartInstance.data.datasets[0].data = [1];
        this.doughnutChartInstance.data.datasets[0].backgroundColor = ['#e2e8f0'];
      } else {
        this.doughnutChartInstance.data.labels = labels;
        this.doughnutChartInstance.data.datasets[0].data = values;
        this.doughnutChartInstance.data.datasets[0].backgroundColor = bgColors.slice(0, data.length);
      }
      this.doughnutChartInstance.update();
      return;
    }

    const ctx = canvas.getContext('2d')!;

        this.doughnutChartInstance = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: data.length > 0 ? labels : ['No Data'],
            datasets: [{
              data: data.length > 0 ? values : [1],
              backgroundColor: data.length > 0 ? bgColors.slice(0, data.length) : ['#e2e8f0'],
              borderWidth: 3,
              borderColor: '#ffffff',
              hoverOffset: 8
            }]
          },
          plugins: [{
            id: 'centerText',
            afterDraw(chart) {
              if (data.length === 0) return;
              const { width, height, ctx: c } = chart;
              const total = values.reduce((a, b) => a + b, 0);
              const label = '\u20b9' + total.toLocaleString('en-IN', { maximumFractionDigits: 0 });
              c.save();
              c.textAlign = 'center';
              c.textBaseline = 'middle';
              const cx = width / 2;
              const cy = height / 2;
              c.font = 'bold 13px Inter, sans-serif';
              c.fillStyle = '#6b7280';
              c.fillText('Total', cx, cy - 12);
              c.font = 'bold 16px Inter, sans-serif';
              c.fillStyle = '#111827';
              c.fillText(label, cx, cy + 10);
              c.restore();
            }
          }],
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  usePointStyle: true,
                  pointStyle: 'circle',
                  padding: 16,
                  font: { family: "Inter, sans-serif", size: 12 },
                  color: '#374151'
                }
              },
              tooltip: {
                callbacks: {
                  label: ctx => {
                      if(data.length === 0) return ' No Sales';
                      const pct = ((ctx.parsed / values.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                      return ` \u20b9${ctx.parsed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}  (${pct}%)`;
                  }
                }
              }
            }
          }
        });
  }
}
