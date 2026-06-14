import { UserDto } from './user';

export interface GoogleLoginInput {
  idToken: string;
}

export interface DemoLoginInput {
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

/**
 * JWT payload issued by the backend (NOT the Google token).
 * Sent as `Authorization: Bearer <token>` on HTTP and as
 * `auth: { token }` in the Socket.io handshake.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}
