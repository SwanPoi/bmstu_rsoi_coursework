import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-post-login',
  standalone: true,
  template: `
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Проверка авторизации и перенаправление...</p>
    </div>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 16px;
      color: #64748b;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class PostLoginComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    ngOnInit(): void {
        const user = this.authService.user();
        
        if (user?.roles.includes('Admin')) {
            this.router.navigate(['/admin/stats']);
        } else if (user?.roles.includes('User')) {
            this.router.navigate(['/cars']);
        } else {
            this.router.navigate(['/login']);
        }
    }
}