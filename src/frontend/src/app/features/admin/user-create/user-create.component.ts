import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environment/environment';

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [],
  template: `
    <div class="user-create">
      <div class="user-create__card">
        <h2>Создание пользователя</h2>
        <p class="user-create__description">
          Для создания нового пользователя вы будете перенаправлены на страницу провайдера идентификации. 
        </p>
        <button type="button" class="btn-primary" (click)="onCreate()">
          Перейти к созданию пользователя
        </button>
      </div>
    </div>
  `,
  styles: [`
    .user-create {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 70vh;
      padding: 24px;
    }
    .user-create__card {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 480px;
      width: 100%;
    }
    .user-create__card h2 {
      margin: 0 0 16px 0;
      color: #1e293b;
    }
    .user-create__description {
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .btn-primary {
      width: 100%;
      padding: 12px 24px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn-primary:hover {
      background: #2563eb;
    }
  `]
})
export class UserCreateComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly apiUrl = environment.apiUrl; 

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['created'] === 'true') {
        this.toast.showSuccess('Пользователь успешно создан');
      } else if (params['error']) {
        const errorMessages: Record<string, string> = {
          'missing_fields': 'Не заполнены обязательные поля',
          'forbidden': 'Недостаточно прав для создания пользователя',
          'invalid_token': 'Сессия истекла. Войдите в систему заново',
          'user_exists': 'Пользователь с таким именем или email уже существует',
          'creation_failed': 'Не удалось создать пользователя. Попробуйте позже',
        };
        this.toast.showError(errorMessages[params['error']] || 'Произошла ошибка');
      }
    });
  }

  onCreate(): void {
    window.location.href = `${this.apiUrl}/users/create-page`;
  }
}