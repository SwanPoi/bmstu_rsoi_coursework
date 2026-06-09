import { StatsRepository, RentalEvent, PaymentEvent, CarEvent, UserEvent } from '../repositories/stats.repository';

export class StatsService {
    private repo: StatsRepository;

    constructor(repo: StatsRepository) {
        this.repo = repo;
    }

    async handleRentalEvent(event: RentalEvent): Promise<void> {
        console.log('Attempting to save rental event to DB:', event);
        try {
            await this.repo.saveRentalEvent(event);
            console.log('Rental event saved successfully to DB');
        } catch (error: any) {
            console.error('CRITICAL: Failed to save rental event to DB!');
            console.error('Error details:', error.message);
            console.error('Event payload:', event);
            throw error; 
        }
    }

    async handlePaymentEvent(event: PaymentEvent): Promise<void> {
        console.log('Attempting to save payment event to DB:', event);
        try {
            await this.repo.savePaymentEvent(event);
            console.log('Payment event saved successfully to DB');
        } catch (error: any) {
            console.error('CRITICAL: Failed to save payment event to DB!');
            console.error('Error details:', error.message);
            console.error('Event payload:', event);
            throw error; 
        }
    }

    // async handleCarEvent(event: CarEvent): Promise<void> {
    //     await this.repo.saveCarEvent(event);
    // }

    async handleCarEvent(event: any): Promise<void> {
        console.log('Attempting to save car event to DB:', event);
        try {
            await this.repo.saveCarEvent(event);
            console.log('Car event saved successfully to DB');
        } catch (error: any) {
            console.error('CRITICAL: Failed to save car event to DB!');
            console.error('Error details:', error.message);
            console.error('Event payload:', event);
            throw error; 
        }
    }

    async handleUserEvent(event: UserEvent): Promise<void> {
        console.log('Attempting to save user event to DB:', event);
        try {
            await this.repo.saveUserEvent(event);
            console.log('User event saved successfully to DB');
        } catch (error: any) {
            console.error('CRITICAL: Failed to save user event to DB!');
            console.error('Error details:', error.message);
            console.error('Event payload:', event);
            throw error; 
        }
    }

    async getRentalStats(dateFrom?: string, dateTo?: string) {
        return await this.repo.getRentalStats(dateFrom, dateTo);
    }

    async getPaymentStats(dateFrom?: string, dateTo?: string) {
        return await this.repo.getPaymentStats(dateFrom, dateTo);
    }

    async getCarStats(dateFrom?: string, dateTo?: string) {
        return await this.repo.getCarStats(dateFrom, dateTo);
    }

    async getUserStats(dateFrom?: string, dateTo?: string) {
        return await this.repo.getUserStats(dateFrom, dateTo);
    }
}