import { Component, output, signal, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { validateDateRange } from '../../utils/date.utils';

@Component({
  selector: 'app-date-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="date-filter">
      <div class="date-filter__inputs">
        <div class="date-filter__field">
          <label>Дата начала</label>
          <input 
            type="date" 
            [(ngModel)]="dateFrom" 
            (change)="onDateChange()" 
            [min]="minDate"
          />
        </div>
        <div class="date-filter__field">
          <label>Дата окончания</label>
          <input 
            type="date" 
            [(ngModel)]="dateTo" 
            (change)="onDateChange()" 
            [min]="dateFrom || minDate"
          />
        </div>
      </div>

      @if (validationError()) {
        <div class="date-filter__error">{{ validationError() }}</div>
      }

      <div class="date-filter__actions">
        <button
          class="date-filter__btn date-filter__btn--primary"
          (click)="onSearch()"
          [disabled]="!isValid()"
        >
          {{ searchButtonText() }}
        </button>
        @if (showClearButton()) {
          <button
            class="date-filter__btn date-filter__btn--secondary"
            (click)="onClear()"
          >
            Очистить
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .date-filter {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    .date-filter__inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .date-filter__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .date-filter__field label {
      font-size: 14px;
      color: #64748b;
      font-weight: 500;
    }
    .date-filter__field input {
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 14px;
    }
    .date-filter__field input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    .date-filter__error {
      color: #ef4444;
      font-size: 13px;
      margin-top: 12px;
    }
    .date-filter__actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }
    .date-filter__btn {
      padding: 10px 24px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }
    .date-filter__btn--primary {
      background: #3b82f6;
      color: white;
    }
    .date-filter__btn--primary:hover:not(:disabled) { background: #2563eb; }
    .date-filter__btn--primary:disabled {
      background: #cbd5e1;
      cursor: not-allowed;
    }
    .date-filter__btn--secondary {
      background: #f1f5f9;
      color: #475569;
    }
    .date-filter__btn--secondary:hover { background: #e2e8f0; }
  `]
})
export class DateFilterComponent {
  search = output<{ dateFrom: Date; dateTo: Date }>();
  clear = output<void>();
  datesChange = output<{ dateFrom: Date | null; dateTo: Date | null }>();

  initialDateFrom = input<string>('');
  initialDateTo = input<string>('');
  searchButtonText = input<string>('Найти');
  showClearButton = input<boolean>(true);

  protected dateFrom: string = '';
  protected dateTo: string = '';
  protected readonly validationError = signal<string | null>(null);
  protected readonly isValid = signal(false);
  protected readonly minDate = new Date().toISOString().split('T')[0];

  constructor() {
    effect(() => {
      const fromDate = this.initialDateFrom();
      const toDate = this.initialDateTo();
      
      if (fromDate && fromDate !== this.dateFrom) {
        this.dateFrom = fromDate;
      }
      if (toDate && toDate !== this.dateTo) {
        this.dateTo = toDate;
      }

      if (fromDate && toDate) {
        this.validate();
      }
    });
  }

  onDateChange(): void {
    this.validate();
    
    if (this.dateFrom && this.dateTo) {
      this.datesChange.emit({
        dateFrom: new Date(this.dateFrom),
        dateTo: new Date(this.dateTo)
      });
    } else {
      this.datesChange.emit({ dateFrom: null, dateTo: null });
    }
  }

  validate(): void {
    if (!this.dateFrom || !this.dateTo) {
      this.validationError.set(null);
      this.isValid.set(false);
      return;
    }

    const from = new Date(this.dateFrom);
    const to = new Date(this.dateTo);
    const error = validateDateRange(from, to);

    this.validationError.set(error);
    this.isValid.set(error === null);
  }

  onSearch(): void {
    if (!this.isValid()) return;
    this.search.emit({
      dateFrom: new Date(this.dateFrom),
      dateTo: new Date(this.dateTo)
    });
  }

  onClear(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.validationError.set(null);
    this.isValid.set(false);
    this.clear.emit();
    this.datesChange.emit({ dateFrom: null, dateTo: null });
  }
}