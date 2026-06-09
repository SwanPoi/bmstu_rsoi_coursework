export interface RentalStats {
    totalRentals: number;
    activeRentals: number;
    finishedRentals: number;
    canceledRentals: number;
}

export interface PaymentStats {
    totalPayments: number;
    paidPayments: number;
    canceledPayments: number;
    totalPaid: number;
    avgPayment: number;
}

export interface CarStats {
    type: string;
    totalCars: number;
    rentedCount: number;
    avgPrice: number;
}

export interface UserStats {
    username: string;
    totalActions: number;
    loginCount: number;
    registrationCount: number;
}