import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';

function snakeToCamel(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(snakeToCamel);

    const result: any = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            result[camelKey] = snakeToCamel(obj[key]);
        }
    }
    return result;
}

export const snakeToCamelInterceptor: HttpInterceptorFn = (req, next) => {
    return next(req).pipe(
        map(event => {
            if (event instanceof HttpResponse) {
                return event.clone({ body: snakeToCamel(event.body) });
            }
            return event;
        })
    );
};