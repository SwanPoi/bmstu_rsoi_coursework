import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { User, UserRole, RegisterRequest } from '../../shared/models/user.model';
import { environment } from '../../../environment/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly apiUrl = environment.apiUrl; 
    private readonly userSignal = signal<User | null>(null);
    private readonly loadedSignal = signal<boolean>(false);

    readonly user = this.userSignal.asReadonly();
    readonly isAuthenticated = computed(() => this.userSignal() !== null);
    readonly isAdmin = computed(() => this.userSignal()?.roles.includes('Admin') ?? false);
    readonly isUser = computed(() => this.userSignal()?.roles.includes('User') ?? false);

    constructor(
        private http: HttpClient,
        private router: Router
    ) {}

    loadCurrentUser(): Observable<User | null> {
        return this.http.get<User>(`${this.apiUrl}/me`).pipe(
            tap(user => {
                this.userSignal.set(user);
                this.loadedSignal.set(true);
            }),
            catchError(() => {
                this.userSignal.set(null);
                this.loadedSignal.set(true);
                return of(null);
            })
        );
    }

    login(): void {
        // const params = new URLSearchParams({ username, password });
        // window.location.href = `${this.apiUrl}/authorize?${params.toString()}`;
        window.location.href = `${this.apiUrl}/authorize`;
    }

    // register(request: RegisterRequest): Observable<any> {
    //     return this.http.post(`${this.apiUrl}/register`, request);
    // }

    register(): void {
        window.location.href = `${this.apiUrl}/register-page`;
    }

    logout(): void {
        window.location.href = `${this.apiUrl}/logout`;
    }

    isLoaded(): boolean {
        return this.loadedSignal();
    }

    hasRole(role: UserRole): boolean {
        return this.userSignal()?.roles.includes(role) ?? false;
    }
}