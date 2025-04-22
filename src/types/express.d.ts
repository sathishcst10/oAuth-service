import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: any;
    isAuthenticated?: boolean;
    accessToken?: string;
  }
}