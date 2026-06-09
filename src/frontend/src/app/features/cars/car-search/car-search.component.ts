import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarService } from '../car.service';
import { CarCardComponent } from '../../../shared/components/car-card/car-card.component';
import { DateFilterComponent } from '../../../shared/components/date-filter/date-filter.component';
import { Car } from '../../../shared/models/car.model';
import { formatDateForApi } from '../../../shared/utils/date.utils';

@Component({
  selector: 'app-car-search',
  standalone: true,
  imports: [CommonModule, FormsModule, CarCardComponent, DateFilterComponent],
  template: `
    <div class="car-search">
      <h1 class="car-search__title">Поиск автомобилей</h1>
      <app-date-filter
        [initialDateFrom]="filterDateFrom()"
        [initialDateTo]="filterDateTo()"
        (search)="onSearch($event)"
        (clear)="onClear()"
      />

      @if (loading()) {
        <div class="car-search__loading">Загрузка...</div>
      } @else if (error()) {
        <div class="car-search__error">{{ error() }}</div>
      } @else if (!filterDateFrom() || !filterDateTo()) {
        <!-- Информационный блок, если даты не введены -->
        <div class="car-info-block">
          <h2>Доступные классы автомобилей</h2>
          <div class="car-types-grid">
            <div class="car-type-card">
              <h3>Седан (SEDAN)</h3>
              <p>Комфортные автомобили для городских поездок и трассы. Идеальный баланс вместительности и экономичности.</p>
            </div>
            <div class="car-type-card">
              <h3>Внедорожник (SUV)</h3>
              <p>Просторные автомобили с высоким клиренсом. Отличный выбор для путешествий, семьи или плохих дорог.</p>
            </div>
            <div class="car-type-card">
              <h3>Минивэн (MINIVAN)</h3>
              <p>Максимальная вместительность для больших компаний или перевозки габаритных грузов с комфортом.</p>
            </div>
            <div class="car-type-card">
              <h3>Родстер (ROADSTER)</h3>
              <p>Спортивные автомобили для ярких впечатлений, динамичной езды и особых случаев.</p>
            </div>
          </div>
          <p class="hint">Выберите даты выше, чтобы увидеть доступные автомобили.</p>
        </div>
      } @else if (cars().length === 0) {
        <div class="car-search__empty">
          <p>Автомобили не найдены</p>
          <p class="hint">Попробуйте изменить параметры поиска</p>
        </div>
      } @else {
        <div class="car-search__results-header">
          <h2>Найдено автомобилей: {{ totalElements() }}</h2>
          <span class="page-info">Страница {{ currentPage() }} из {{ totalPages() }}</span>
        </div>

        <div class="car-search__grid">
          @for (car of cars(); track car.carUid) {
            <app-car-card [car]="car" />
          }
        </div>

        @if (totalPages() > 1) {
          <div class="pagination">
            <button 
              class="pagination__btn" 
              [disabled]="currentPage() === 1"
              (click)="goToPage(currentPage() - 1)"
            >
              ← Назад
            </button>

            <div class="pagination__pages">
              @for (page of visiblePages(); track page) {
                @if (page === -1) {
                  <span class="pagination__dots">...</span>
                } @else {
                  <button 
                    class="pagination__page" 
                    [class.active]="page === currentPage()"
                    (click)="goToPage(page)"
                  >
                    {{ page }}
                  </button>
                }
              }
            </div>

            <button 
              class="pagination__btn" 
              [disabled]="currentPage() === totalPages()"
              (click)="goToPage(currentPage() + 1)"
            >
              Вперёд →
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .car-search { max-width: 1400px; margin: 0 auto; padding: 24px 20px; }
    .car-search__title { margin: 0 0 24px 0; font-size: 28px; color: #1e293b; }
    .car-search__results-header { display: flex; justify-content: space-between; align-items: center; margin: 32px 0 16px; }
    .car-search__results-header h2 { margin: 0; font-size: 20px; color: #334155; }
    .page-info { color: #64748b; font-size: 14px; }
    .car-search__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
    .car-search__loading, .car-search__error, .car-search__empty { text-align: center; padding: 60px 20px; color: #64748b; font-size: 16px; background: white; border-radius: 12px; margin-top: 24px; }
    .car-search__error { color: #ef4444; }
    .car-search__empty .hint { color: #94a3b8; font-size: 14px; margin-top: 8px; }
    
    /* Стили для информационного блока */
    .car-info-block { margin-top: 32px; }
    .car-info-block h2 { font-size: 20px; color: #334155; margin-bottom: 16px; }
    .car-types-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 24px; }
    .car-type-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); text-align: center; transition: transform 0.2s; }
    .car-type-card:hover { transform: translateY(-4px); }
    .car-type-card .icon { font-size: 40px; margin-bottom: 12px; }
    .car-type-card h3 { margin: 0 0 8px 0; color: #1e293b; font-size: 18px; }
    .car-type-card p { margin: 0; color: #64748b; font-size: 14px; line-height: 1.5; }
    .hint { text-align: center; color: #3b82f6; font-weight: 500; margin-top: 16px; }

    .pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 40px; padding: 20px; }
    .pagination__btn { padding: 10px 20px; background: white; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; color: #475569; transition: all 0.2s; }
    .pagination__btn:hover:not(:disabled) { background: #f1f5f9; border-color: #3b82f6; color: #3b82f6; }
    .pagination__btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .pagination__pages { display: flex; gap: 4px; }
    .pagination__page { width: 40px; height: 40px; background: white; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; color: #475569; transition: all 0.2s; }
    .pagination__page:hover:not(.active) { background: #f1f5f9; border-color: #3b82f6; color: #3b82f6; }
    .pagination__page.active { background: #3b82f6; border-color: #3b82f6; color: white; }
    .pagination__dots { display: flex; align-items: center; padding: 0 8px; color: #94a3b8; }
  `]
})
export class CarSearchComponent implements OnInit {
  private readonly carService = inject(CarService);

  protected readonly cars = signal<Car[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  
  protected readonly currentPage = signal(1);
  protected readonly pageSize = 12;
  protected readonly totalElements = signal(0);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalElements() / this.pageSize)));

  protected readonly filterDateFrom = signal<string>('');
  protected readonly filterDateTo = signal<string>('');

  private currentDateFrom: string | null = null;
  private currentDateTo: string | null = null;

  protected readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages: number[] = [];
    pages.push(1);
    if (current > 3) pages.push(-1);
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push(-1);
    if (total > 1) pages.push(total);
    return pages;
  });

  ngOnInit(): void {
    this.loadDatesFromStorage();
  }

  onSearch(dates: { dateFrom: Date; dateTo: Date }): void {
    this.currentDateFrom = formatDateForApi(dates.dateFrom);
    this.currentDateTo = formatDateForApi(dates.dateTo);
    this.saveDatesToStorage(dates.dateFrom, dates.dateTo);
    this.filterDateFrom.set(this.currentDateFrom);
    this.filterDateTo.set(this.currentDateTo);
    this.currentPage.set(1);
    this.loadCars();
  }

  onClear(): void {
    this.currentDateFrom = null;
    this.currentDateTo = null;
    this.filterDateFrom.set('');
    this.filterDateTo.set('');
    this.clearDatesFromStorage();
    this.currentPage.set(1);
    this.cars.set([]); // Очищаем список при сбросе дат
    this.totalElements.set(0);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.currentPage.set(page);
    this.loadCars();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private loadCars(): void {
    // Не загружаем автомобили, если даты не введены
    if (!this.currentDateFrom || !this.currentDateTo) return;
    
    this.loading.set(true);
    this.error.set(null);
    this.carService.getCars(
      this.currentPage(), 
      this.pageSize, 
      false, 
      this.currentDateFrom || undefined, 
      this.currentDateTo || undefined
    ).subscribe({
      next: response => {
        this.cars.set(response.items);
        this.totalElements.set(response.totalElements);
        this.loading.set(false);
      },
      error: err => {
        this.error.set('Не удалось загрузить автомобили');
        this.loading.set(false);
      }
    });
  }

  private loadDatesFromStorage(): void {
    const storedDates = localStorage.getItem('carRentalDates');
    if (storedDates) {
      try {
        const dates = JSON.parse(storedDates);
        const dateFrom = new Date(dates.dateFrom);
        const dateTo = new Date(dates.dateTo);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (dateFrom >= today && dateTo >= dateFrom) {
          this.currentDateFrom = formatDateForApi(dateFrom);
          this.currentDateTo = formatDateForApi(dateTo);
          this.filterDateFrom.set(this.currentDateFrom);
          this.filterDateTo.set(this.currentDateTo);
          this.loadCars();
        } else {
          localStorage.removeItem('carRentalDates');
        }
      } catch (e) {
        console.error('Failed to parse stored dates', e);
        localStorage.removeItem('carRentalDates');
      }
    }
  }

  private saveDatesToStorage(dateFrom: Date, dateTo: Date): void {
    const dates = { dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() };
    localStorage.setItem('carRentalDates', JSON.stringify(dates));
  }

  private clearDatesFromStorage(): void {
    localStorage.removeItem('carRentalDates');
  }
}