import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import authService from '../services/auth-service.js';
import fetch from 'node-fetch';

// Make sure we're loading the environment variables
dotenv.config();

const router = express.Router();
let msClient: any;

// Initialize a custom Microsoft OAuth client implementation
// This avoids the issues with openid-client library
export async function initializeMicrosoftClient() {
  try {
    // Force reloading environment variables
    dotenv.config();
    
    // Check for required environment variables
    const CLIENT_ID = process.env.CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET;
    const REDIRECT_URI = process.env.REDIRECT_URI;
    const TENANT_ID = process.env.TENANT_ID;
    
    if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !TENANT_ID) {
      throw new Error("Missing required OAuth configuration variables");
    }
    
    // Manually fetch OpenID configuration
    const discoveryUrl = `https://login.microsoftonline.com/${TENANT_ID}/v2.0/.well-known/openid-configuration`;
    console.log(`Fetching OpenID configuration from: ${discoveryUrl}`);
    
    const response = await fetch(discoveryUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenID configuration: ${response.status} ${response.statusText}`);
    }
    
    const metadata = await response.json();
    console.log('Discovered OpenID configuration successfully');
    
    // Create a simplified custom client object with the essential methods
    msClient = {
      config: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        metadata: metadata
      },
      
      // Authentication URL generation
      authorizationUrl: function(options) {
        const url = new URL(metadata.authorization_endpoint);
        url.searchParams.append('client_id', CLIENT_ID);
        url.searchParams.append('response_type', 'code');
        url.searchParams.append('redirect_uri', REDIRECT_URI);
        
        // Add additional parameters from options
        if (options.scope) url.searchParams.append('scope', options.scope);
        if (options.response_mode) url.searchParams.append('response_mode', options.response_mode);
        if (options.state) url.searchParams.append('state', options.state);
        if (options.nonce) url.searchParams.append('nonce', options.nonce);
        
        return url.toString();
      },
      
      // Extract parameters from callback request
      callbackParams: function(req) {
        return req.method === 'POST' ? req.body : req.query;
      },
      
      // Process the OAuth callback
      callback: async function(redirectUri, params, checks) {
        // Verify state
        if (checks && checks.state && params.state !== checks.state) {
          throw new Error('State mismatch');
        }
        
        // Exchange code for token
        const tokenResponse = await fetch(metadata.token_endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: redirectUri,
            code: params.code
          })
        });
        
        if (!tokenResponse.ok) {
          const error = await tokenResponse.text();
          throw new Error(`Token exchange failed: ${error}`);
        }
        
        return await tokenResponse.json();
      },
      
      // Fetch user information
      userinfo: async function(tokenSet) {
        const userInfoResponse = await fetch(metadata.userinfo_endpoint, {
          headers: {
            'Authorization': `Bearer ${tokenSet.access_token}`
          }
        });
        
        if (!userInfoResponse.ok) {
          const error = await userInfoResponse.text();
          throw new Error(`User info fetch failed: ${error}`);
        }
        
        return await userInfoResponse.json();
      }
    };
    
    console.log('Microsoft OAuth client initialized successfully');
    return msClient;
  } catch (error) {
    console.error('Error initializing Microsoft OAuth client:', error);
    console.error('Error details:', (error as any).message);
    throw error;
  }
}

// Login route handler
const handleLogin = (req: Request, res: Response) => {
  if (!msClient) {
    return res.status(500).send('OAuth client not initialized');
  }

  try {
    // Generate random state parameter for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);
    const nonce = Math.random().toString(36).substring(2, 15);
    
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
  } catch (error) {
    console.error('Error generating authorization URL:', error);
    res.status(500).send('Authentication initialization failed');
  }
};

// Callback route handler
const handleCallback = async (req: Request, res: Response) => {
  try {
    if (!msClient) {
      return res.status(500).send('OAuth client not initialized');
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