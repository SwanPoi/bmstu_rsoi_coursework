import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h2>Добро пожаловать</h2>
        <p class="auth-description">
          Для доступа к системе аренды автомобилей необходимо пройти авторизацию.
        </p>
        <button type="button" class="btn-primary" (click)="onLogin()">
          Перейти к авторизации
        </button>
        <p class="auth-link">Нет аккаунта? <a routerLink="/register">Зарегистрироваться</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      background: #f1f5f9;
    }
    .auth-card {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 400px;
      width: 100%;
    }
    .auth-card h2 { margin-top: 0; color: #1e293b; }
    .auth-description { color: #64748b; margin-bottom: 24px; line-height: 1.5; }
    .btn-primary {
      width: 100%;
      padding: 12px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 16px;
      transition: background 0.2s;
    }
    .btn-primary:hover { background: #2563eb; }
    .auth-link { margin-top: 20px; color: #64748b; font-size: 14px; }
    .auth-link a { color: #3b82f6; text-decoration: none; font-weight: 500; }
    .auth-link a:hover { text-decoration: underline; }
  `]
})
export class LoginComponent {
    private readonly authService = inject(AuthService);
    private readonly route = inject(ActivatedRoute);
    private readonly toast = inject(ToastService);

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            if (params['registered'] === 'true') {
                this.toast.showSuccess('Регистрация успешна! Теперь вы можете войти в систему.');
            }
        });
    }

    onLogin(): void {
        this.authService.login();
    }
}