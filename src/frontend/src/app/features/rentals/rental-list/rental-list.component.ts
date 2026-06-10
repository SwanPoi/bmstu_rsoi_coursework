import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RentalService } from '../../../core/services/rental.service';
import { Rental, RentalStatus } from '../../../shared/models/rental.model';
import { RentalCardComponent } from '../../../shared/components/rental-card/rental-card.component';

@Component({
  selector: 'app-rental-list',
  standalone: true,
  imports: [CommonModule, RouterLink, RentalCardComponent],
  template: `
    <div class="rental-list">
      <div class="rental-list__header">
        <h2>Мои аренды</h2>
        
        <label class="group-toggle">
          <input 
            type="checkbox" 
            [checked]="groupByStatus()" 
            (change)="groupByStatus.set($any($event.target).checked)"
          />
          <span>Группировать по статусу</span>
        </label>
      </div>

      @if (rentals().length === 0) {
        <p class="empty">У вас пока нет активных или завершенных аренд.</p>
      } @else if (groupByStatus()) {
        @for (group of groupedRentals(); track group.status) {
          @if (group.items.length > 0) {
            <div class="rental-group">
              <div class="rental-group__header">
                <h3 class="rental-group__title">
                  <span class="rental-group__badge" [class]="getBadgeClass(group.status)">
                    {{ getStatusText(group.status) }}
                  </span>
                  <span class="rental-group__count">{{ group.items.length }}</span>
                </h3>
              </div>
              <div class="rentals-grid">
                @for (rental of group.items; track rental.rentalUid) {
                  <app-rental-card [rental]="rental" />
                }
              </div>
            </div>
          }
        }
      } @else {
        <div class="rentals-grid">
          @for (rental of sortedRentals(); track rental.rentalUid) {
            <app-rental-card [rental]="rental" />
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .rental-list { max-width: 1200px; margin: 0 auto; padding: 24px; }
    
    .rental-list__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    
    .rental-list__header h2 { margin: 0; font-size: 28px; color: #1e293b; }
    
    .group-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 8px 12px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      user-select: none;
    }
    
    .group-toggle input { cursor: pointer; }
    .group-toggle span { color: #475569; font-size: 14px; font-weight: 500; }
    
    .rental-group { margin-bottom: 32px; }
    
    .rental-group__header {
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .rental-group__title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      font-size: 18px;
      color: #334155;
    }
    
    .rental-group__badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
    }
    
    .badge-in-progress { background: #dbeafe; color: #1e40af; }
    .badge-finished { background: #d1fae5; color: #065f46; }
    .badge-canceled { background: #fee2e2; color: #991b1b; }
    
    .rental-group__count {
      background: #f1f5f9;
      color: #64748b;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 500;
    }
    
    .rentals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    
    .empty { text-align: center; color: #64748b; padding: 60px 20px; font-size: 16px; }
  `]
})
export class RentalListComponent {
  private readonly rentalService = inject(RentalService);

  protected readonly rentals = signal<Rental[]>([]);
  protected readonly groupByStatus = signal<boolean>(true);

  private readonly statusOrder: Record<RentalStatus, number> = {
    'IN_PROGRESS': 0,
    'FINISHED': 1,
    'CANCELED': 2
  };

  protected readonly sortedRentals = computed(() => {
    return [...this.rentals()].sort((a, b) => {
      const statusDiff = this.statusOrder[a.status] - this.statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.dateFrom).getTime() - new Date(a.dateFrom).getTime();
    });
  });

  protected readonly groupedRentals = computed(() => {
    const sorted = this.sortedRentals();
    const groups: { status: RentalStatus; items: Rental[] }[] = [
      { status: 'IN_PROGRESS', items: [] },
      { status: 'FINISHED', items: [] },
      { status: 'CANCELED', items: [] }
    ];

    for (const rental of sorted) {
      const group = groups.find(g => g.status === rental.status);
      if (group) group.items.push(rental);
    }

    return groups;
  });

  ngOnInit(): void {
    this.rentalService.getRentals().subscribe(data => this.rentals.set(data));
  }

  getStatusText(status: RentalStatus): string {
    const map: Record<RentalStatus, string> = {
      'IN_PROGRESS': 'Активные',
      'FINISHED': 'Завершённые',
      'CANCELED': 'Отменённые'
    };
    return map[status] || status;
  }

  getBadgeClass(status: RentalStatus): string {
    const map: Record<RentalStatus, string> = {
      'IN_PROGRESS': 'badge-in-progress',
      'FINISHED': 'badge-finished',
      'CANCELED': 'badge-canceled'
    };
    return map[status] || '';
  }
}