import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { AuthService } from './core/auth/auth.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, HeaderComponent, ToastContainerComponent],
    templateUrl: 'app.html',
    styleUrls: ['app.scss']
})
export class AppComponent implements OnInit {
    private readonly authService = inject(AuthService);

    ngOnInit(): void {
      this.authService.loadCurrentUser().subscribe();
    }
}