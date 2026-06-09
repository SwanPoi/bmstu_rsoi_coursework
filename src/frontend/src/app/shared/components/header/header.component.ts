import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
    protected readonly authService = inject(AuthService);
    private readonly elementRef = inject(ElementRef);
    
    protected readonly isUserMenuOpen = signal(false);

    toggleUserMenu(): void {
        this.isUserMenuOpen.update(open => !open);
    }

    closeUserMenu(): void {
        this.isUserMenuOpen.set(false);
    }

    logout(): void {
        this.closeUserMenu();
        this.authService.logout();
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event): void {
        if (this.isUserMenuOpen() && !this.elementRef.nativeElement.contains(event.target)) {
            this.closeUserMenu();
        }
    }

    @HostListener('window:keydown.escape')
    onEscapeKey(): void {
        this.closeUserMenu();
    }
}