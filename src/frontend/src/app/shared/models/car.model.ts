export type CarType = 'SEDAN' | 'SUV' | 'MINIVAN' | 'ROADSTER';

export interface Car {
    carUid: string;
    brand: string;
    model: string;
    registrationNumber: string;
    power: number;
    type: CarType;
    price: number;
    available: boolean;
}

export interface CarCreateRequest {
    brand: string;
    model: string;
    registrationNumber: string;
    power: number;
    type: CarType;
    price: number;
}

export interface PaginationResponse<T> {
    page: number;
    pageSize: number;
    totalElements: number;
    items: T[];
}