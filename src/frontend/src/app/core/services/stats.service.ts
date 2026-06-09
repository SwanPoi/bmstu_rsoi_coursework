import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RentalStats, PaymentStats, CarStats, UserStats } from '../../shared/models/stats.model';
import { environment } from '../../../environment/environment';

@Injectable({ providedIn: 'root' })
export class StatsService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/stats`;

    getRentalStats(dateFrom?: string, dateTo?: string): Observable<RentalStats> {
        let params = new HttpParams();
        if (dateFrom) params = params.set('dateFrom', dateFrom);
        if (dateTo) params = params.set('dateTo', dateTo);

        return this.http.get<RentalStats>(`${this.apiUrl}/rentals`, { params });
    }

    getPaymentStats(dateFrom?: string, dateTo?: string): Observable<PaymentStats> {
        let params = new HttpParams();
        if (dateFrom) params = params.set('dateFrom', dateFrom);
        if (dateTo) params = params.set('dateTo', dateTo);

        return this.http.get<PaymentStats>(`${this.apiUrl}/payments`, { params });
    }

    getCarStats(dateFrom?: string, dateTo?: string): Observable<CarStats[]> {
        let params = new HttpParams();
        if (dateFrom) params = params.set('dateFrom', dateFrom);
        if (dateTo) params = params.set('dateTo', dateTo);

        return this.http.get<CarStats[]>(`${this.apiUrl}/cars`, { params });
    }

    getUserStats(dateFrom?: string, dateTo?: string): Observable<UserStats[]> {
        let params = new HttpParams();
        if (dateFrom) params = params.set('dateFrom', dateFrom);
        if (dateTo) params = params.set('dateTo', dateTo);

        return this.http.get<UserStats[]>(`${this.apiUrl}/users`, { params });
    }
}