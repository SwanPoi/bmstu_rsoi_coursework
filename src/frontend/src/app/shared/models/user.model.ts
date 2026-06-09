export type UserRole = 'Admin' | 'User';

export interface User {
  username: string;
  email: string;
  roles: UserRole[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
}