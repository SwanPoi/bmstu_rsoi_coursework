export type RentalStatus = 'IN_PROGRESS' | 'FINISHED' | 'CANCELED';

export interface Rental {
    rentalUid: string;
    status: RentalStatus;
    carUid: string;
    car: {
        brand: string;
        model: string;
        registrationNumber: string;
    };
    paymentUid: string;
    payment: {
        status: string;
        price: number;
    };
    dateFrom: string;
    dateTo: string;
}

export interface RentCreationRequest {
    carUid: string;
    dateFrom: string;
    dateTo: string;
}