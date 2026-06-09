import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Car, PaginationResponse } from '../../shared/models/car.model';
import { environment } from '../../../environment/environment';

@Injectable({ providedIn: 'root' })
export class CarService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/cars`;

    getCars(
        page: number = 1,
        size: number = 10,
        showAll: boolean = false,
        dateFrom?: string,
        dateTo?: string
    ): Observable<PaginationResponse<Car>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString())
            .set('showAll', showAll.toString());

        if (dateFrom) params = params.set('dateFrom', dateFrom);
        if (dateTo) params = params.set('dateTo', dateTo);

        return this.http.get<PaginationResponse<Car>>(this.apiUrl, { params });
    }

    getCarById(carUid: string): Observable<Car> {
        return this.http.get<Car>(`${this.apiUrl}/${carUid}`);
    }

    createCar(car: Partial<Car>): Observable<Car> {
        const requestPayload = {
            brand: car.brand,
            model: car.model,
            registration_number: car.registrationNumber,
            power: car.power,
            price: car.price,
            type: car.type
        };

        return this.http.post<Car>(this.apiUrl, requestPayload);
    }
}