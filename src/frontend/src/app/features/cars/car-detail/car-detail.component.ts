import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CarService } from '../car.service';
import { RentalService } from '../../../core/services/rental.service';
import { DateFilterComponent } from '../../../shared/components/date-filter/date-filter.component';
import { Car } from '../../../shared/models/car.model';
import { formatDateForApi } from '../../../shared/utils/date.utils';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-car-detail',
  standalone: true,
  imports: [DateFilterComponent],
  template: `
    @if (car()) {
      <div class="car-detail">
        <button class="back-button" (click)="goBack()">
          ← Назад к поиску автомобилей
        </button>

        <div class="car-detail__header">
          <h1>{{ car()!.brand }} {{ car()!.model }}</h1>
          <span class="car-detail__type">{{ getTypeName(car()!.type) }}</span>
        </div>
        
        <div class="car-detail__info">
          <p><strong>Гос. номер:</strong> {{ car()!.registrationNumber || 'Не указан' }}</p>
          <p><strong>Мощность:</strong> {{ car()!.power }} л.с.</p>
          <p><strong>Цена:</strong> {{ car()!.price }} ₽/день</p>
        </div>

        <div class="car-detail__booking">
          <h3>Забронировать автомобиль</h3>
          
          <app-date-filter 
            [initialDateFrom]="filterDateFrom()"
            [initialDateTo]="filterDateTo()"
            searchButtonText="Арендовать"
            [showClearButton]="false"
            (search)="onRent($event)"
            (datesChange)="onDatesChange($event)"
            (clear)="clearDates()"
          />
          
          @if (validationError()) {
            <p class="error-msg">{{ validationError() }}</p>
          }
          
          @if (totalPrice() > 0) {
            <div class="total-price">
              <span class="total-price__label">Итого за {{ daysCount() }} дн.:</span>
              <span class="total-price__value">{{ totalPrice() }} ₽</span>
            </div>
          }
        </div>
      </div>
    } @else {
      <div class="loading-state">Загрузка информации об автомобиле...</div>
    }
  `,
  styles: [`
    .car-detail {
      max-width: 800px;
      margin: 40px auto;
      padding: 30px;
      background: white;
      border-radius: 12px;
    }
    .back-button {
      background: none;
      border: none;
      color: #3b82f6;
      font-size: 16px;
      cursor: pointer;
      margin-bottom: 20px;
      padding: 0;
    }
    .back-button:hover {
      text-decoration: underline;
    }
    .car-detail__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .car-detail__type {
      background: #3b82f6;
      color: white;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 14px;
    }
    .car-detail__info {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 32px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .car-detail__booking {
      border-top: 1px solid #e2e8f0;
      padding-top: 24px;
    }
    .error-msg {
      color: #ef4444;
      font-size: 14px;
      margin-top: 8px;
    }
    .total-price {
      margin-top: 20px;
      padding: 16px 20px;
      background: #f0fdf4;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #bbf7d0;
    }
    .total-price__label {
      color: #166534;
      font-size: 15px;
    }
    .total-price__value {
      color: #15803d;
      font-size: 24px;
      font-weight: 700;
    }
    .loading-state {
      text-align: center;
      padding: 60px;
      color: #64748b;
    }
  `]
})
export class CarDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly carService = inject(CarService);
  private readonly rentalService = inject(RentalService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  
  protected readonly car = signal<Car | null>(null);
  protected validationError = signal<string | null>(null);
  
  protected readonly filterDateFrom = signal<string>('');
  protected readonly filterDateTo = signal<string>('');
  
  protected selectedDateFrom = signal<Date | null>(null);
  protected selectedDateTo = signal<Date | null>(null);
  private selectedDates: { dateFrom: Date; dateTo: Date } | null = null;

  protected readonly daysCount = computed(() => {
    const from = this.selectedDateFrom();
    const to = this.selectedDateTo();
    if (!from || !to) return 0;
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return (diffDays || 0) + 1;
  });

  protected readonly totalPrice = computed(() => {
    const days = this.daysCount();
    const price = this.car()?.price ?? 0;
    return days * price;
  });

  ngOnInit(): void {
    const carUid = this.route.snapshot.paramMap.get('carUid');
    
    this.loadDatesFromStorage();
    
    if (carUid) {
      this.carService.getCarById(carUid).subscribe({
        next: car => {
          this.car.set(car);

          if (this.filterDateFrom() && this.filterDateTo()) {
            this.selectedDateFrom.set(new Date(this.filterDateFrom()));
            this.selectedDateTo.set(new Date(this.filterDateTo()));
          }
        },
        error: () => {
          this.toast.showError('Не удалось загрузить информацию об автомобиле');
          this.router.navigate(['/cars']);
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/cars']);
  }

  onDatesChange(dates: { dateFrom: Date | null; dateTo: Date | null }): void {
    this.selectedDateFrom.set(dates.dateFrom);
    this.selectedDateTo.set(dates.dateTo);
    
    if (dates.dateFrom && dates.dateTo) {
      this.selectedDates = { dateFrom: dates.dateFrom, dateTo: dates.dateTo };
    } else {
      this.selectedDates = null;
    }
  }

  onRent(dates: { dateFrom: Date; dateTo: Date }): void {
    this.selectedDates = dates;
    this.saveDatesToStorage(dates.dateFrom, dates.dateTo);
    this.executeRent();
  }

  clearDates(): void {
    this.selectedDates = null;
    this.selectedDateFrom.set(null);
    this.selectedDateTo.set(null);
    this.filterDateFrom.set('');
    this.filterDateTo.set('');
    this.validationError.set(null);
    this.clearDatesFromStorage();
  }

  private executeRent(): void {
    if (!this.car() || !this.selectedDates) return;

    const request = {
      carUid: this.car()!.carUid,
      dateFrom: formatDateForApi(this.selectedDates.dateFrom),
      dateTo: formatDateForApi(this.selectedDates.dateTo)
    };

    this.rentalService.rentCar(request).subscribe({
      next: (response) => {
        this.toast.showSuccess('Аренда успешно оформлена!');
        this.clearDatesFromStorage();
        this.router.navigate(['/rentals', response.rentalUid]);
      },
      error: () => {}
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
          const dateFromStr = formatDateForApi(dateFrom);
          const dateToStr = formatDateForApi(dateTo);
          
          this.filterDateFrom.set(dateFromStr);
          this.filterDateTo.set(dateToStr);
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
    const dates = {
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString()
    };
    localStorage.setItem('carRentalDates', JSON.stringify(dates));
  }

  private clearDatesFromStorage(): void {
    localStorage.removeItem('carRentalDates');
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
}