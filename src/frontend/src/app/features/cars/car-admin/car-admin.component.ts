import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarService } from '../car.service';
import { Car, CarCreateRequest, CarType } from '../../../shared/models/car.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-car-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-cars">
      <h2>Управление автомобилями</h2>

      <div class="create-form">
        <h3>Добавить новый автомобиль</h3>
        <form (ngSubmit)="onCreate()" #carForm="ngForm" class="form-grid">
          <!-- Марка -->
          <div class="form-field">
            <label class="form-label">Марка *</label>
            <input 
              type="text" 
              [ngModel]="newCar().brand" 
              (ngModelChange)="updateField('brand', $event)"
              name="brand" 
              required
              #brandCtrl="ngModel"
              placeholder="Например: BMW"
              autofocus
            />
            <!-- @if (brandCtrl.touched && brandCtrl.errors?.['required']) {
              <span class="field-error">Введите марку автомобиля</span>
            } -->
          </div>

          <!-- Модель -->
          <div class="form-field">
            <label class="form-label">Модель *</label>
            <input 
              type="text" 
              [ngModel]="newCar().model" 
              (ngModelChange)="updateField('model', $event)"
              name="model" 
              required
              #modelCtrl="ngModel"
              placeholder="Например: X5"
            />
            <!-- @if (modelCtrl.touched && modelCtrl.errors?.['required']) {
              <span class="field-error">Введите модель автомобиля</span>
            } -->
          </div>

          <!-- Гос. номер -->
          <div class="form-field">
            <label class="form-label">Гос. номер *</label>
            <input 
              type="text" 
              [ngModel]="newCar().registrationNumber" 
              (ngModelChange)="updateField('registrationNumber', $event)"
              name="registrationNumber" 
              required
              #regCtrl="ngModel"
              placeholder="Например: А123БВ777"
            />
            <!-- @if (regCtrl.touched && regCtrl.errors?.['required']) {
              <span class="field-error">Введите государственный номер</span>
            } -->
          </div>

          <!-- Мощность -->
          <div class="form-field">
            <label class="form-label">Мощность (л.с.) *</label>
            <input 
              type="number" 
              [ngModel]="newCar().power" 
              (ngModelChange)="updateField('power', $event)"
              name="power" 
              required
              min="1"
              #powerCtrl="ngModel"
              placeholder="Например: 340"
            />
            <!-- @if (powerCtrl.touched && powerCtrl.errors?.['required']) {
              <span class="field-error">Введите мощность</span>
            }
            @if (powerCtrl.touched && powerCtrl.errors?.['min']) {
              <span class="field-error">Минимум 1 л.с.</span>
            } -->
          </div>

          <!-- Цена -->
          <div class="form-field">
            <label class="form-label">Цена в день (₽) *</label>
            <input 
              type="number" 
              [ngModel]="newCar().price" 
              (ngModelChange)="updateField('price', $event)"
              name="price" 
              required
              min="1"
              #priceCtrl="ngModel"
              placeholder="Например: 5500"
            />
            <!-- @if (priceCtrl.touched && priceCtrl.errors?.['required']) {
              <span class="field-error">Введите цену</span>
            }
            @if (priceCtrl.touched && priceCtrl.errors?.['min']) {
              <span class="field-error">Минимум 1 ₽</span>
            } -->
          </div>

          <!-- Тип кузова -->
          <div class="form-field">
            <label class="form-label">Тип кузова *</label>
            <select 
              [ngModel]="newCar().type" 
              (ngModelChange)="updateField('type', $event)"
              name="type" 
              required
              #typeCtrl="ngModel"
            >
              <option value="" disabled>Выберите тип кузова</option>
              @for (type of carTypes; track type) {
                <option [value]="type">{{ getTypeName(type) }}</option>
              }
            </select>
            <!-- @if (typeCtrl.touched && typeCtrl.errors?.['required']) {
              <span class="field-error">Выберите тип кузова</span>
            } -->
          </div>

          <!-- Кнопка с тултипом -->
          <div class="form-field form-field--full">
            <div class="btn-wrapper" [class.disabled]="!isFormValid()">
              <button 
                type="submit" 
                class="btn-primary" 
                [disabled]="!isFormValid() || isLoading()"
              >
                @if (isLoading()) {
                  <span class="spinner"></span>
                  Добавление...
                } @else {
                  Добавить автомобиль
                }
              </button>
              @if (!isFormValid() && !isLoading()) {
                <span class="tooltip">
                  Заполните все обязательные поля для добавления автомобиля
                </span>
              }
            </div>
          </div>
        </form>
      </div>

      <div class="cars-list">
        <h3>Список автомобилей ({{ cars().length }})</h3>
        @if (loading()) {
          <div class="loading-state">Загрузка списка автомобилей...</div>
        } @else if (cars().length === 0) {
          <p class="empty-list">Автомобили ещё не добавлены</p>
        } @else {
          <div class="cars-grid">
            @for (car of cars(); track car.carUid) {
              <div class="car-item">
                <div class="car-item__header">
                  <span class="car-item__type" [class]="'type-' + car.type.toLowerCase()">
                    {{ getTypeName(car.type) }}
                  </span>
                  <span class="car-item__status" [class.available]="car.available">
                    {{ car.available ? 'Доступен' : 'Занят' }}
                  </span>
                </div>
                <div class="car-item__body">
                  <h4>{{ car.brand }} {{ car.model }}</h4>
                  <p class="car-item__reg">{{ car.registrationNumber }}</p>
                  <div class="car-item__specs">
                    <span>{{ car.power }} л.с.</span>
                    <span class="car-item__price">{{ car.price }} ₽/день</span>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .admin-cars { 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: 24px; 
    }
    
    .admin-cars h2 { 
      margin: 0 0 24px 0; 
      color: #1e293b; 
      font-size: 28px; 
    }
    
    .admin-cars h3 { 
      margin: 0 0 16px 0; 
      color: #334155; 
      font-size: 18px; 
    }

    .create-form { 
      background: white; 
      padding: 24px; 
      border-radius: 12px; 
      margin-bottom: 32px; 
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .form-grid { 
      display: grid; 
      grid-template-columns: repeat(3, 1fr); 
      gap: 16px; 
    }

    @media (max-width: 768px) {
      .form-grid { 
        grid-template-columns: repeat(2, 1fr); 
      }
    }

    @media (max-width: 480px) {
      .form-grid { 
        grid-template-columns: 1fr; 
      }
    }

    .form-field { 
      display: flex; 
      flex-direction: column; 
      gap: 6px; 
    }

    .form-field--full { 
      grid-column: span 3; 
    }

    @media (max-width: 768px) {
      .form-field--full { 
        grid-column: span 2; 
      }
    }

    @media (max-width: 480px) {
      .form-field--full { 
        grid-column: span 1; 
      }
    }

    .form-label {
      font-size: 13px;
      font-weight: 600;
      color: #475569;
    }

    .form-field input, 
    .form-field select { 
      padding: 10px 12px; 
      border: 1px solid #cbd5e1; 
      border-radius: 6px; 
      font-size: 14px;
      transition: border-color 0.2s, box-shadow 0.2s;
      background: white;
    }

    .form-field input:focus, 
    .form-field select:focus { 
      outline: none; 
      border-color: #3b82f6; 
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); 
    }

    // .form-field input.ng-invalid.ng-touched,
    // .form-field select.ng-invalid.ng-touched {
    //   border-color: #ef4444;
    // }

    .field-error { 
      color: #ef4444; 
      font-size: 12px; 
      margin-top: 2px; 
    }

    /* Кнопка и тултип */
    .btn-wrapper { 
      position: relative; 
      display: inline-block; 
      width: 100%; 
    }

    .btn-primary { 
      width: 100%; 
      padding: 12px 24px; 
      background: #10b981; 
      color: white; 
      border: none; 
      border-radius: 6px; 
      cursor: pointer; 
      font-weight: 600; 
      font-size: 15px;
      transition: background 0.2s, opacity 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .btn-primary:hover:not(:disabled) { 
      background: #059669; 
    }

    .btn-primary:disabled { 
      background: #94a3b8; 
      cursor: not-allowed; 
      opacity: 0.7;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .tooltip { 
      position: absolute; 
      bottom: calc(100% + 8px); 
      left: 50%; 
      transform: translateX(-50%); 
      background: #1e293b; 
      color: white; 
      padding: 8px 14px; 
      border-radius: 6px; 
      font-size: 13px; 
      font-weight: 500;
      white-space: nowrap; 
      pointer-events: none; 
      opacity: 0; 
      transition: opacity 0.2s; 
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .tooltip::after { 
      content: ''; 
      position: absolute; 
      top: 100%; 
      left: 50%; 
      transform: translateX(-50%); 
      border: 6px solid transparent; 
      border-top-color: #1e293b; 
    }

    .btn-wrapper.disabled:hover .tooltip { 
      opacity: 1; 
    }

    /* Список автомобилей */
    .cars-list { 
      margin-top: 32px;
    }

    .cars-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .car-item { 
      background: white; 
      padding: 16px; 
      border-radius: 8px; 
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .car-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .car-item__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .car-item__type {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      background: #f1f5f9;
      color: #475569;
    }

    .car-item__type.type-sedan { background: #dbeafe; color: #1e40af; }
    .car-item__type.type-suv { background: #fef3c7; color: #92400e; }
    .car-item__type.type-minivan { background: #d1fae5; color: #065f46; }
    .car-item__type.type-roadster { background: #fce7f3; color: #9d174d; }

    .car-item__status {
      font-size: 12px;
      color: #94a3b8;
    }

    .car-item__status.available {
      color: #10b981;
      font-weight: 600;
    }

    .car-item__body h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      color: #1e293b;
    }

    .car-item__reg {
      margin: 0 0 12px 0;
      color: #64748b;
      font-size: 13px;
    }

    .car-item__specs {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;
    }

    .car-item__specs span {
      font-size: 13px;
      color: #475569;
    }

    .car-item__price {
      font-weight: 700;
      color: #10b981;
      font-size: 14px;
    }

    .muted { color: #64748b; font-size: 14px; }
    
    .empty-list { 
      text-align: center; 
      color: #94a3b8; 
      padding: 40px; 
      background: white; 
      border-radius: 8px; 
    }

    .loading-state {
      text-align: center;
      padding: 40px;
      color: #64748b;
      background: white;
      border-radius: 8px;
    }
  `]
})
export class CarAdminComponent implements OnInit {
  private readonly carService = inject(CarService);
  private readonly toast = inject(ToastService);

  protected readonly cars = signal<Car[]>([]);
  protected readonly loading = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly carTypes: CarType[] = ['SEDAN', 'SUV', 'MINIVAN', 'ROADSTER'];

  protected readonly newCar = signal<Partial<CarCreateRequest>>({ 
    type: 'SEDAN' 
  });

  protected readonly isFormValid = computed(() => {
    const car = this.newCar();
    return !!(
      car.brand?.trim() &&
      car.model?.trim() &&
      car.registrationNumber?.trim() &&
      car.power && car.power > 0 &&
      car.price && car.price > 0 &&
      car.type
    );
  });

  ngOnInit(): void {
    this.loadCars();
  }

  updateField(field: keyof CarCreateRequest, value: any): void {
    this.newCar.update(car => ({ ...car, [field]: value }));
  }

  onCreate(): void {
    if (!this.isFormValid() || this.isLoading()) return;

    this.isLoading.set(true);

    this.carService.createCar(this.newCar() as CarCreateRequest).subscribe({
      next: () => {
        this.toast.showSuccess('Автомобиль успешно добавлен');
        this.resetForm();
        this.loadCars();
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err?.status === 409) {
          this.toast.showError('Автомобиль с таким номером уже существует');
        } else if (err?.status === 400) {
          this.toast.showError('Некорректные данные автомобиля');
        } else {
          this.toast.showError('Не удалось добавить автомобиль');
        }
      }
    });
  }

  private loadCars(): void {
    this.loading.set(true);
    this.carService.getCars(1, 100, true).subscribe({
      next: (res) => {
        this.cars.set(res.items);
        this.loading.set(false);
      },
      error: () => {
        this.toast.showError('Не удалось загрузить список автомобилей');
        this.loading.set(false);
      }
    });
  }

  private resetForm(): void {
    this.newCar.set({ type: 'SEDAN' });
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