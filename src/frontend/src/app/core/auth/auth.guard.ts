import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isLoaded() && !authService.isAuthenticated()) {
        router.navigate(['/login']);
        return of(false);
    }

    if (authService.isLoaded() && authService.isAuthenticated()) {
        return of(true);
    }

    return authService.loadCurrentUser().pipe(
        map(user => {
            if (!user) {
                router.navigate(['/login']);
                return false;
            }
            return true;
        }),
        catchError(() => {
            router.navigate(['/login']);
            return of(false);
        })
    );
};