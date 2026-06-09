import { Component, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Rental } from '../../models/rental.model';

@Component({
  selector: 'app-rental-card',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  template: `
    <div class="rental-card">
      <div class="rental-card__header">
        <span class="rental-card__status" [class]="getStatusClass(rental().status)">
          {{ getStatusText(rental().status) }}
        </span>
        <span class="rental-card__date">
          {{ rental().dateFrom | date:'dd.MM.yyyy' }} — {{ rental().dateTo | date:'dd.MM.yyyy' }}
        </span>
      </div>
      <div class="rental-card__body">
        <h3>{{ rental().car.brand }} {{ rental().car.model }}</h3>
        <p class="muted">{{ rental().car.registrationNumber }}</p>
        <p class="price">{{ rental().payment.price }} ₽</p>
      </div>
      <div class="rental-card__footer">
        <a [routerLink]="['/rentals', rental().rentalUid]" class="btn-details">
          Подробнее
        </a>
      </div>
    </div>
  `,
  styles: [`
    .rental-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .rental-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    }
    .rental-card__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .rental-card__status {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-in-progress { background: #dbeafe; color: #1e40af; }
    .status-finished { background: #d1fae5; color: #065f46; }
    .status-canceled { background: #fee2e2; color: #991b1b; }
    .rental-card__date { color: #64748b; font-size: 14px; }
    .rental-card__body { flex: 1; }
    .rental-card__body h3 { margin: 0 0 4px 0; font-size: 16px; }
    .muted { color: #64748b; font-size: 14px; margin: 0; }
    .price { font-size: 20px; font-weight: bold; color: #10b981; margin: 12px 0 0 0; }
    .rental-card__footer { margin-top: 16px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
    .btn-details {
      display: block;
      text-align: center;
      background: #3b82f6;
      color: white;
      padding: 10px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
      transition: background 0.2s;
    }
    .btn-details:hover { background: #2563eb; }
  `]
})
export class RentalCardComponent {
  rental = input.required<Rental>();

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