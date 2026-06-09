import { Component, inject, signal, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { StatsService } from '../../../core/services/stats.service';
import { RentalStats, PaymentStats, CarStats, UserStats } from '../../../shared/models/stats.model';

Chart.register(...registerables);

type TimePeriod = 'all' | 'month' | 'quarter' | 'year' | 'custom';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="stats-dashboard">
      <div class="stats-header">
        <h2>Панель статистики</h2>
        <div class="period-selector">
          <label>Период:</label>
          <select [(ngModel)]="selectedPeriod" (change)="onPeriodChange()">
            <option value="all">Все время</option>
            <option value="month">Текущий месяц</option>
            <option value="quarter">Текущий квартал</option>
            <option value="year">Текущий год</option>
            <option value="custom">Произвольный период</option>
          </select>
          
          @if (selectedPeriod === 'custom') {
            <div class="custom-dates">
              <input type="date" [(ngModel)]="customDateFrom" (change)="loadStats()" />
              <span>—</span>
              <input type="date" [(ngModel)]="customDateTo" (change)="loadStats()" />
            </div>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="loading">Загрузка статистики...</div>
      } @else {
        <!-- Карточки с основными метриками -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-content">
              <div class="metric-value">{{ rentalStats()?.totalRentals || 0 }}</div>
              <div class="metric-label">Всего аренд</div>
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-content">
              <div class="metric-value">{{ paymentStats()?.totalPaid || 0 }} ₽</div>
              <div class="metric-label">Общая выручка</div>
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-content">
              <div class="metric-value">{{ getTotalCars() }}</div>
              <div class="metric-label">Всего автомобилей</div>
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-content">
              <div class="metric-value">{{ userStats()?.length || 0 }}</div>
              <div class="metric-label">Активных пользователей</div>
            </div>
          </div>
        </div>

        <!-- Графики -->
        <div class="charts-grid">
          <div class="chart-card">
            <h3>Статусы аренд</h3>
            <div class="chart-container">
              <canvas #rentalStatusChart></canvas>
            </div>
          </div>

          <div class="chart-card">
            <h3>Статусы платежей</h3>
            <div class="chart-container">
              <canvas #paymentStatusChart></canvas>
            </div>
          </div>

          <div class="chart-card wide">
            <h3>Автопарк по типам</h3>
            <div class="chart-container">
              <canvas #carTypesChart></canvas>
            </div>
          </div>

          <div class="chart-card wide">
            <h3>Топ-10 активных пользователей</h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Всего действий</th>
                  <th>Входов</th>
                  <th>Регистраций</th>
                </tr>
              </thead>
              <tbody>
                @for (user of userStats(); track user.username) {
                  <tr>
                    <td>{{ user.username }}</td>
                    <td>{{ user.totalActions }}</td>
                    <td>{{ user.loginCount }}</td>
                    <td>{{ user.registrationCount }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .stats-dashboard { max-width: 1400px; margin: 0 auto; padding: 24px; }
    .stats-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
    .stats-header h2 { margin: 0; font-size: 28px; color: #1e293b; }
    .period-selector { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .period-selector label { font-weight: 500; color: #475569; }
    .period-selector select, .custom-dates input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; background: white; }
    .custom-dates { display: flex; align-items: center; gap: 8px; }
    .loading { text-align: center; padding: 60px; color: #64748b; font-size: 16px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px; }
    .metric-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; align-items: center; gap: 16px; transition: transform 0.2s; }
    .metric-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .metric-content { flex: 1; }
    .metric-value { font-size: 28px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    .metric-label { font-size: 14px; color: #64748b; }
    .charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
    .chart-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .chart-card.wide { grid-column: span 2; }
    .chart-card h3 { margin: 0 0 20px 0; font-size: 18px; color: #334155; }
    .chart-container { position: relative; height: 300px; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .data-table th { background: #f8fafc; color: #475569; font-weight: 600; font-size: 14px; }
    .data-table td { color: #1e293b; }
    @media (max-width: 1024px) {
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
      .charts-grid { grid-template-columns: 1fr; }
      .chart-card.wide { grid-column: span 1; }
    }
    @media (max-width: 640px) {
      .metrics-grid { grid-template-columns: 1fr; }
      .stats-header { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class StatsComponent implements OnInit, OnDestroy {
  private readonly statsService = inject(StatsService);

  @ViewChild('rentalStatusChart') rentalStatusCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('paymentStatusChart') paymentStatusCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('carTypesChart') carTypesCanvas!: ElementRef<HTMLCanvasElement>;

  protected readonly rentalStats = signal<RentalStats | null>(null);
  protected readonly paymentStats = signal<PaymentStats | null>(null);
  protected readonly carStats = signal<CarStats[]>([]);
  protected readonly userStats = signal<UserStats[]>([]);
  protected readonly loading = signal(true);

  protected selectedPeriod: TimePeriod = 'all';
  protected customDateFrom = '';
  protected customDateTo = '';

  private rentalChart: Chart | null = null;
  private paymentChart: Chart | null = null;
  private carTypesChart: Chart | null = null;
  private chartsInitialized = false;
  private completedRequests = 0;
  private totalRequests = 4;

  ngOnInit(): void {
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.rentalChart?.destroy();
    this.paymentChart?.destroy();
    this.carTypesChart?.destroy();
  }

  onPeriodChange(): void {
    if (this.selectedPeriod !== 'custom') {
      this.loadStats();
    }
  }

  loadStats(): void {
    this.loading.set(true);
    this.chartsInitialized = false;
    this.completedRequests = 0;

    const { dateFrom, dateTo } = this.getDateRange();

    const checkComplete = () => {
      this.completedRequests++;
      if (this.completedRequests === this.totalRequests) {
        this.loading.set(false);
        setTimeout(() => {
          if (!this.chartsInitialized) {
            this.initCharts();
            this.chartsInitialized = true;
          } else {
            this.updateCharts();
          }
        }, 10);
      }
    };

    this.statsService.getRentalStats(dateFrom, dateTo).subscribe({
      next: stats => { this.rentalStats.set(stats); checkComplete(); },
      error: () => checkComplete()
    });

    this.statsService.getPaymentStats(dateFrom, dateTo).subscribe({
      next: stats => { this.paymentStats.set(stats); checkComplete(); },
      error: () => checkComplete()
    });

    this.statsService.getCarStats(dateFrom, dateTo).subscribe({
      next: stats => { this.carStats.set(stats); checkComplete(); },
      error: () => checkComplete()
    });

    this.statsService.getUserStats(dateFrom, dateTo).subscribe({
      next: stats => { this.userStats.set(stats); checkComplete(); },
      error: () => checkComplete()
    });
  }

  getTotalCars(): number {
    return this.carStats().reduce((sum, stat) => sum + Number(stat.totalCars), 0);
  }

  getTypeName(type: string): string {
    const map: Record<string, string> = {
      'SEDAN': 'Седан',
      'SUV': 'Внедорожник',
      'MINIVAN': 'Минивэн',
      'ROADSTER': 'Родстер'
    };
    return map[type] || type;
  }

  private initCharts(): void {
    if (!this.rentalStatusCanvas?.nativeElement ||
        !this.paymentStatusCanvas?.nativeElement ||
        !this.carTypesCanvas?.nativeElement) {
      return;
    }

    this.rentalChart = new Chart(this.rentalStatusCanvas.nativeElement, {
      type: 'pie',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 20, font: { size: 14 } } }
        }
      }
    });

    this.paymentChart = new Chart(this.paymentStatusCanvas.nativeElement, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });

    this.carTypesChart = new Chart(this.carTypesCanvas.nativeElement, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });

    this.updateCharts();
  }

  private updateCharts(): void {
    this.updateRentalChart();
    this.updatePaymentChart();
    this.updateCarTypesChart();
  }

  private updateRentalChart(): void {
    const stats = this.rentalStats();
    if (!stats || !this.rentalChart) return;

    this.rentalChart.data = {
      labels: ['Активные', 'Завершенные', 'Отмененные'],
      datasets: [{
        data: [
          Number(stats.activeRentals) || 0,
          Number(stats.finishedRentals) || 0,
          Number(stats.canceledRentals) || 0
        ],
        backgroundColor: ['#3b82f6', '#10b981', '#ef4444'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
    this.rentalChart.update();
  }

  private updatePaymentChart(): void {
    const stats = this.paymentStats();
    if (!stats || !this.paymentChart) return;

    this.paymentChart.data = {
      labels: ['Успешные', 'Отмененные'],
      datasets: [{
        data: [
          Number(stats.paidPayments) || 0,
          Number(stats.canceledPayments) || 0
        ],
        backgroundColor: ['#10b981', '#ef4444'],
        borderRadius: 8
      }]
    };
    this.paymentChart.update();
  }

  private updateCarTypesChart(): void {
    const stats = this.carStats();
    if (!stats || stats.length === 0 || !this.carTypesChart) return;

    this.carTypesChart.data = {
      labels: stats.map(s => this.getTypeName(s.type)),
      datasets: [{
        label: 'Количество',
        data: stats.map(s => Number(s.totalCars)),
        backgroundColor: '#3b82f6',
        borderRadius: 8
      }]
    };
    this.carTypesChart.update();
  }

  private getDateRange(): { dateFrom?: string; dateTo?: string } {
    const now = new Date();
    
    switch (this.selectedPeriod) {
      case 'month': {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        return { dateFrom: this.formatDate(firstDay), dateTo: this.formatDate(now) };
      }
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        const firstDay = new Date(now.getFullYear(), quarter * 3, 1);
        return { dateFrom: this.formatDate(firstDay), dateTo: this.formatDate(now) };
      }
      case 'year': {
        const firstDay = new Date(now.getFullYear(), 0, 1);
        return { dateFrom: this.formatDate(firstDay), dateTo: this.formatDate(now) };
      }
      case 'custom': {
        return { 
          dateFrom: this.customDateFrom || undefined, 
          dateTo: this.customDateTo || undefined 
        };
      }
      default:
        return {};
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}