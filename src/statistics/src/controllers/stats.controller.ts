import { Request, Response } from 'express';
import { StatsService } from '../services/stats.service';

export class StatsController {
    private statsService: StatsService;

    constructor(statsService: StatsService) {
        this.statsService = statsService;
    }

    private validateDateFormat(dateStr: string): boolean {
        const datePattern = /^\d{4}-\d{2}-\d{2}$/; 
        console.log('Date query string', dateStr, datePattern.test(dateStr))
        return datePattern.test(dateStr) && !isNaN(Date.parse(dateStr)); 
    }

    private extractStringParam(param: any): string | undefined {
        if (Array.isArray(param)) {
            return param[0];
        }
        return param;
    }

    async getRentalStats(req: Request, res: Response) {
        try {
            const dateFrom = this.extractStringParam(req.query.dateFrom);
            const dateTo = this.extractStringParam(req.query.dateTo);
            
            if (dateFrom && !this.validateDateFormat(dateFrom as string)) {
                return res.status(400).json({ error: 'Invalid dateFrom format. Use YYYY-MM-DD' });
            }
            if (dateTo && !this.validateDateFormat(dateTo as string)) {
                return res.status(400).json({ error: 'Invalid dateTo format. Use YYYY-MM-DD' });
            }

            const stats = await this.statsService.getRentalStats(
                dateFrom as string,
                dateTo as string
            );
            res.json(stats);
        } catch (error: any) {
            console.error('Error in getRentalStats:', error);
            res.status(500).json({ error: 'Failed to get rental stats: ' + error.message });
        }
    }

    async getPaymentStats(req: Request, res: Response) {
        try {
            const dateFrom = this.extractStringParam(req.query.dateFrom);
            const dateTo = this.extractStringParam(req.query.dateTo);
            
            if (dateFrom && !this.validateDateFormat(dateFrom as string)) {
                return res.status(400).json({ error: 'Invalid dateFrom format. Use YYYY-MM-DD' });
            }
            if (dateTo && !this.validateDateFormat(dateTo as string)) {
                return res.status(400).json({ error: 'Invalid dateTo format. Use YYYY-MM-DD' });
            }

            const stats = await this.statsService.getPaymentStats(
                dateFrom as string,
                dateTo as string
            );
            res.json(stats);
        } catch (error: any) {
            console.error('Error in getPaymentStats:', error);
            res.status(500).json({ error: 'Failed to get payment stats: ' + error.message });
        }
    }

    async getCarStats(req: Request, res: Response) {
        console.log('Query', req.query)
        try {
            const dateFrom = this.extractStringParam(req.query.dateFrom);
            const dateTo = this.extractStringParam(req.query.dateTo);

            if (dateFrom && !this.validateDateFormat(dateFrom as string)) {
                return res.status(400).json({ error: 'Invalid dateFrom format. Use YYYY-MM-DD' });
            }
            if (dateTo && !this.validateDateFormat(dateTo as string)) {
                return res.status(400).json({ error: 'Invalid dateTo format. Use YYYY-MM-DD' });
            }

            const stats = await this.statsService.getCarStats(
                dateFrom as string,
                dateTo as string
            );
            res.json(stats);
        } catch (error: any) {
            console.error('Error in getCarStats:', error);
            res.status(500).json({ error: 'Failed to get car stats: ' + error.message });
        }
    }

    async getUserStats(req: Request, res: Response) {
        try {
            const dateFrom = this.extractStringParam(req.query.dateFrom);
            const dateTo = this.extractStringParam(req.query.dateTo);
            
            if (dateFrom && !this.validateDateFormat(dateFrom as string)) {
                return res.status(400).json({ error: 'Invalid dateFrom format. Use YYYY-MM-DD' });
            }
            if (dateTo && !this.validateDateFormat(dateTo as string)) {
                return res.status(400).json({ error: 'Invalid dateTo format. Use YYYY-MM-DD' });
            }

            const stats = await this.statsService.getUserStats(
                dateFrom as string,
                dateTo as string
            );
            res.json(stats);
        } catch (error: any) {
            console.error('Error in getUserStats:', error);
            res.status(500).json({ error: 'Failed to get user stats: ' + error.message });
        }
    }
}