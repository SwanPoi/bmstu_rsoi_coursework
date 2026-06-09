import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Car } from '../../models/car.model';

@Component({
    selector: 'app-car-card',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: 'car-card.component.html',
    styleUrls: ['car-card.component.scss'],
})
export class CarCardComponent {
    car = input.required<Car>();  

    typeMap: Record<string, string> = {
        'SEDAN': 'Седан',
        'SUV': 'Внедорожник',
        'MINIVAN': 'Минивэн',
        'ROADSTER': 'Родстер'
    };
}