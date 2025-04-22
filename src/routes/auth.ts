import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import authService from '../services/auth-service';

dotenv.config();

const router = express.Router();
let msClient: any;
let openidClient: any;

// Initialize Microsoft OpenID client
export async function initializeMicrosoftClient() {
  try {
    // Dynamically import openid-client
    openidClient = await import('openid-client');
    const { Issuer } = openidClient;
    
    const microsoftIssuer = await Issuer.discover(
      `https://login.microsoftonline.com/${process.env.TENANT_ID}/v2.0/.well-known/openid-configuration`
    );
    
    console.log('Discovered Microsoft issuer %s', microsoftIssuer.issuer);
    
    msClient = new microsoftIssuer.Client({
      client_id: process.env.CLIENT_ID as string,
      client_secret: process.env.CLIENT_SECRET as string,
      redirect_uris: [process.env.REDIRECT_URI as string],
      response_types: ['code'],
    });
    
    console.log('Microsoft OpenID client initialized successfully');
    return msClient;
  } catch (error) {
    console.error('Error initializing Microsoft OpenID client:', error);
    throw error;
  }
}

// Login route handler
const handleLogin = (req: Request, res: Response) => {
  if (!msClient) {
    return res.status(500).send('OpenID client not initialized');
  }

  // Generate random state parameter for CSRF protection
  const state = openidClient.generators.state();
  const nonce = openidClient.generators.nonce();
  
  // Store state in session to validate on callback
  if (req.session) {
    req.session.authState = state;
    req.session.authNonce = nonce;
  }

  const authUrl = msClient.authorizationUrl({
    scope: 'openid profile email',
    response_mode: 'form_post',
    state,
    nonce,
  });
  
  res.redirect(authUrl);
};

// Callback route handler
const handleCallback = async (req: Request, res: Response) => {
  try {
    if (!msClient) {
      return res.status(500).send('OpenID client not initialized');
    }
    
    // Verify state matches to prevent CSRF attacks
    if (req.session?.authState !== req.body.state) {
      return res.status(403).send('State verification failed');
    }

    const params = msClient.callbackParams(req);
    const tokenSet = await msClient.callback(
      process.env.REDIRECT_URI as string, 
      params,
      {
        state: req.session?.authState,
        nonce: req.session?.authNonce
      }
    );
    
    // Get user info
    const userinfo = await msClient.userinfo(tokenSet);
    
    // Enrich user info with additional claims
    const enrichedUserInfo = authService.enrichUserInfo(userinfo);
    
    // Store token in service cache
    authService.storeUserToken(enrichedUserInfo.sub, tokenSet);
    
    // Store user info in session
    if (req.session) {
      req.session.user = enrichedUserInfo;
      req.session.isAuthenticated = true;
      req.session.accessToken = tokenSet.access_token;
      
      // Clean up auth state variables
      delete req.session.authState;
      delete req.session.authNonce;
    }
    
    res.redirect('/profile');
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).send('Authentication failed');
  }
};

// Logout route handler
const handleLogout = (req: Request, res: Response) => {
  if (req.session?.user) {
    // Clear the token from the auth service
    authService.clearUserToken(req.session.user.sub);
    
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
      res.redirect('/');
    });
  } else {
    res.redirect('/');
  }
};

// Register routes
// @ts-ignore
router.get('/login', handleLogin);
// @ts-ignore
router.post('/callback', handleCallback);
// @ts-ignore
router.get('/logout', handleLogout);

export default router;