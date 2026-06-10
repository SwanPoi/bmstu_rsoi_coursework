import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RentalService } from '../../../core/services/rental.service';
import { Rental } from '../../../shared/models/rental.model';
import { ToastService } from '../../../core/services/toast.service';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-rental-detail',
  standalone: true,
  imports: [DatePipe, CommonModule],
  template: `
    @if (rental()) {
      <div class="rental-detail">
        <!-- КНОПКА ВОЗВРАТА -->
        <button class="back-button" (click)="goBack()">
          ← Назад к списку аренд
        </button>

        <h2>Детали аренды</h2>
        <div class="detail-card">
          <div class="info-row">
            <span class="label">Статус:</span>
            <span class="value" [class]="getStatusClass(rental()!.status)">
              {{ getStatusText(rental()!.status) }}
            </span>
          </div>
          <div class="info-row">
            <span class="label">Автомобиль:</span>
            <span class="value">{{ rental()!.car.brand }} {{ rental()!.car.model }} ({{ rental()!.car.registrationNumber }})</span>
          </div>
          <div class="info-row">
            <span class="label">Период:</span>
            <span class="value">{{ rental()!.dateFrom | date:'dd.MM.yyyy' }} — {{ rental()!.dateTo | date:'dd.MM.yyyy' }}</span>
          </div>
          <div class="info-row">
            <span class="label">Стоимость:</span>
            <span class="value price">{{ rental()!.payment.price }} ₽</span>
          </div>

          @if (rental()!.status === 'IN_PROGRESS') {
            <div class="actions">
              <button class="btn-finish" (click)="finish()">Завершить аренду</button>
              <button class="btn-cancel" (click)="cancel()">Отменить аренду</button>
            </div>
          }
        </div>
      </div>
    } @else {
      <div class="loading-state">Загрузка информации об аренде...</div>
    }
  `,
  styles: [`
    .rental-detail { max-width: 600px; margin: 40px auto; padding: 24px; }
    
    .back-button { 
      background: none; 
      border: none; 
      color: #3b82f6; 
      font-size: 15px; 
      font-weight: 500; 
      cursor: pointer; 
      padding: 0; 
      margin-bottom: 24px; 
      display: flex; 
      align-items: center; 
      gap: 4px; 
      transition: color 0.2s; 
    }
    .back-button:hover { color: #1d4ed8; text-decoration: underline; }

    .detail-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    .info-row:last-child { border-bottom: none; }
    .label { color: #64748b; }
    .value { font-weight: 500; }
    .value.price { color: #10b981; font-size: 18px; font-weight: 600; }
    
    .actions { display: flex; gap: 12px; margin-top: 24px; }
    .btn-finish, .btn-cancel { flex: 1; padding: 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; color: white; transition: opacity 0.2s; }
    .btn-finish { background: #10b981; }
    .btn-finish:hover { opacity: 0.9; }
    .btn-cancel { background: #ef4444; }
    .btn-cancel:hover { opacity: 0.9; }

    .loading-state { text-align: center; padding: 60px; color: #64748b; }

    .status-in-progress { color: #1e40af; background: #dbeafe; padding: 4px 8px; border-radius: 4px; font-size: 13px; }
    .status-finished { color: #065f46; background: #d1fae5; padding: 4px 8px; border-radius: 4px; font-size: 13px; }
    .status-canceled { color: #991b1b; background: #fee2e2; padding: 4px 8px; border-radius: 4px; font-size: 13px; }
  `]
})
export class RentalDetailComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly rentalService = inject(RentalService);
    private readonly toast = inject(ToastService);
    private readonly router = inject(Router);
    
    protected readonly rental = signal<Rental | null>(null);

    ngOnInit(): void {
        const uid = this.route.snapshot.paramMap.get('rentalUid');
        if (uid) {
        this.rentalService.getRentalById(uid).subscribe({
            next: data => this.rental.set(data),
            error: () => {
            this.toast.showError('Не удалось загрузить информацию об аренде');
            this.router.navigate(['/rentals']);
            }
        });
        }
    }

    goBack(): void {
        this.router.navigate(['/rentals']);
    }

    finish(): void {
        const uid = this.rental()!.rentalUid;
        this.rentalService.finishRental(uid).subscribe({
        next: () => {
            this.toast.showSuccess('Аренда успешно завершена');
            this.rentalService.getRentalById(uid).subscribe(data => this.rental.set(data));
        }
        });
    }

    cancel(): void {
        const uid = this.rental()!.rentalUid;
        this.rentalService.cancelRental(uid).subscribe({
        next: () => {
            this.toast.showWarning('Аренда отменена');
            this.router.navigate(['/rentals']);
        }
        });
    }

    getStatusText(status: string): string {
        const map: Record<string, string> = { 
        'IN_PROGRESS': 'Активна', 
        'FINISHED': 'Завершена', 
        'CANCELED': 'Отменена' 
        };
        return map[status] || status;
    }

    getStatusClass(status: string): string {
        const map: Record<string, string> = { 
        'IN_PROGRESS': 'status-in-progress', 
        'FINISHED': 'status-finished', 
        'CANCELED': 'status-canceled' 
        };
        return map[status] || '';
    }
}