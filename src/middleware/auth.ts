import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth-service';

// Extend Express Request type to include our session properties
declare module 'express-session' {
  interface SessionData {
    user?: any;
    isAuthenticated?: boolean;
    accessToken?: string;
    authState?: string;
    authNonce?: string;
  }
}

/**
 * Middleware to ensure user is authenticated
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  
  // Store the original URL for redirecting back after login
  if (req.session) {
    req.session.returnTo = req.originalUrl;
  }
  
  // Redirect to login page if not authenticated
  res.redirect('/auth/login');
};

/**
 * Middleware to check token validity
 */
export const checkTokenValidity = (req: Request, res: Response, next: NextFunction) => {
  if (req.session?.user?.sub && req.session?.accessToken) {
    const userToken = authService.getUserToken(req.session.user.sub);
    
    // If token is expired, redirect to login
    if (userToken && authService.isTokenExpired(userToken)) {
      console.log('Token expired, redirecting to login');
      return res.redirect('/auth/login');
    }
  }
  
  next();
};

/**
 * Middleware to pass user data to templates
 */
export const setUserLocals = (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
    res.locals.isAuthenticated = req.session.isAuthenticated;
  }
  next();
};