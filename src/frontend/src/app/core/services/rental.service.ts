import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Rental, RentCreationRequest } from '../../shared/models/rental.model';
import { environment } from '../../../environment/environment';

@Injectable({ providedIn: 'root' })
export class RentalService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/rental`;

    getRentals(): Observable<Rental[]> {
        return this.http.get<Rental[]>(this.apiUrl);
    }

    getRentalById(rentalUid: string): Observable<Rental> {
        return this.http.get<Rental>(`${this.apiUrl}/${rentalUid}`);
    }

    rentCar(request: RentCreationRequest): Observable<Rental> {
        return this.http.post<Rental>(this.apiUrl, request);
    }

    finishRental(rentalUid: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/${rentalUid}/finish`, {});
    }

    cancelRental(rentalUid: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${rentalUid}`);
    }
}