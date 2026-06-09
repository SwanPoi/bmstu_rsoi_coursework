import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const toastService = inject(ToastService);
    const router = inject(Router);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            let message = 'Произошла ошибка';
            console.log(error)
            if (error.status === 0) {
                message = 'Сервер недоступен';
            } else if (error.status === 400 && error.error?.message?.startsWith('Car is already')) {
                message = 'Автомобиль недоступен в выбранные даты.';
            } else if (error.status === 401) {
                //message = 'Сессия истекла. Выполните вход заново.';
                setTimeout(() => router.navigate(['/login']), 1500);
                return throwError(() => error);
            } else if (error.status === 403) {
                message = 'У вас нет прав для выполнения этого действия';
            } else if (error.status === 404) {
                message = 'Запрашиваемый ресурс не найден';
            } else if (error.status >= 500) {
                message = error.error?.message || 'Ошибка на стороне сервера';
            } else if (error.error?.message) {
                message = error.error.message;
            }

            toastService.showError(message);
            return throwError(() => error);
        })
    );
};