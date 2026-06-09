import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h2>Создание аккаунта</h2>
        <p class="auth-description">
          Для создания новой учетной записи вы будете перенаправлены на страницу провайдера.
        </p>
        <button type="button" class="btn-primary" (click)="onRegister()">
          Перейти к регистрации
        </button>
        <p class="auth-link">Уже есть аккаунт? <a routerLink="/login">Войти</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-container { display: flex; justify-content: center; align-items: center; min-height: 80vh; background: #f1f5f9; }
    .auth-card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 100%; }
    .auth-card h2 { margin-top: 0; color: #1e293b; }
    .auth-description { color: #64748b; margin-bottom: 24px; line-height: 1.5; }
    .btn-primary { width: 100%; padding: 12px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 16px; transition: background 0.2s; }
    .btn-primary:hover { background: #059669; }
    .auth-link { margin-top: 20px; color: #64748b; font-size: 14px; }
    .auth-link a { color: #3b82f6; text-decoration: none; font-weight: 500; }
    .auth-link a:hover { text-decoration: underline; }
  `]
})
export class RegisterComponent {
    private readonly authService = inject(AuthService);

    onRegister(): void {
        this.authService.register();
    }
}