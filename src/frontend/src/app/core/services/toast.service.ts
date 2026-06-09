import { Injectable, signal } from '@angular/core';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
    private readonly toastsSignal = signal<Toast[]>([]);
    private nextId = 0;

    readonly toasts = this.toastsSignal.asReadonly();

    show(message: string, type: Toast['type'] = 'info', duration = 4000): void {
        const id = this.nextId++;
        const toast: Toast = { id, message, type, duration };
        this.toastsSignal.update(list => [...list, toast]);

        setTimeout(() => this.remove(id), duration);
    }

    showSuccess(message: string, duration = 4000): void {
        this.show(message, 'success', duration);
    }

    showError(message: string, duration = 6000): void {
        this.show(message, 'error', duration);
    }

    showInfo(message: string, duration = 4000): void {
        this.show(message, 'info', duration);
    }

    showWarning(message: string, duration = 5000): void {
        this.show(message, 'warning', duration);
    }

    remove(id: number): void {
        this.toastsSignal.update(list => list.filter(t => t.id !== id));
    }
}