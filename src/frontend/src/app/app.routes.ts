import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';
import { userGuard } from './core/auth/user.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'post-login',
        pathMatch: 'full'
    },
    {
        path: 'post-login',
        canActivate: [authGuard],
        loadComponent: () => import('./features/auth/post-login/post-login.component')
        .then(m => m.PostLoginComponent)
    },
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component')
            .then(m => m.LoginComponent)
    },
    {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component')
            .then(m => m.RegisterComponent)
    },
    {
        path: 'cars',
        canActivate: [userGuard],
        loadComponent: () => import('./features/cars/car-search/car-search.component')
            .then(m => m.CarSearchComponent)
    },
    {
        path: 'cars/:carUid',
        canActivate: [userGuard],
        loadComponent: () => import('./features/cars/car-detail/car-detail.component')
            .then(m => m.CarDetailComponent)
    },
    {
        path: 'rentals',
        canActivate: [userGuard],
        loadComponent: () => import('./features/rentals/rental-list/rental-list.component')
            .then(m => m.RentalListComponent)
    },
    {
        path: 'rentals/:rentalUid',
        canActivate: [userGuard],
        loadComponent: () => import('./features/rentals/rental-detail/rental-detail.component')
            .then(m => m.RentalDetailComponent)
    },
    {
        path: 'admin/stats',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/stats/stats.component')
            .then(m => m.StatsComponent)
    },
    {
        path: 'admin/cars',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/cars/car-admin/car-admin.component')
            .then(m => m.CarAdminComponent)
    },
    {
        path: 'admin/users',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/user-create/user-create.component')
            .then(m => m.UserCreateComponent)
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];