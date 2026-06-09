import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';

export interface CreateUserRequest {
    username: string;
    password: string;
    email: string;
    roles: string[];
}

@Injectable({ providedIn: 'root' })
export class UserService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    createUser(request: CreateUserRequest): Observable<any> {
        return this.http.post(`${this.apiUrl}/users`, request);
    }
}