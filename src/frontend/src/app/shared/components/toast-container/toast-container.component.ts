import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
    selector: 'app-toast-container',
    standalone: true,
    imports: [CommonModule],
    templateUrl: 'toast-container.component.html',
    styleUrls: ['toast-container.component.scss'],
})
export class ToastContainerComponent {
    protected readonly toastService = inject(ToastService);
}