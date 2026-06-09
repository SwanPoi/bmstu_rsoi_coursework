import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

export const adminGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoaded() || !authService.isAuthenticated()) {
        return authGuard(route, state);
    }

    if (!authService.isAdmin()) {
        router.navigate(['/rentals']);
        return false;
    }

    return of(true);
};