/**
 * Authentication Service for Microsoft OAuth
 * Handles token management and user information
 */

// Define our own interface for the token structure
interface TokenSet {
  access_token?: string;
  token_type?: string;
  id_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  [key: string]: any;
}

interface UserInfo {
  sub: string;
  name?: string;
  email?: string;
  preferred_username?: string;
  [key: string]: any;
}

class AuthService {
  private static instance: AuthService;
  private tokenCache: Map<string, TokenSet>;
  
  private constructor() {
    this.tokenCache = new Map();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }
  
  /**
   * Store user token in cache
   */
  public storeUserToken(userId: string, tokenSet: TokenSet): void {
    this.tokenCache.set(userId, tokenSet);
  }
  
  /**
   * Get user token from cache
   */
  public getUserToken(userId: string): TokenSet | undefined {
    return this.tokenCache.get(userId);
  }
  
  /**
   * Check if token is expired
   */
  public isTokenExpired(token: TokenSet): boolean {
    const expiresAt = token.expires_at || 0;
    return Date.now() >= expiresAt * 1000;
  }
  
  /**
   * Enrich user info with additional claims
   */
  public enrichUserInfo(userInfo: UserInfo): UserInfo {
    return {
      ...userInfo,
      displayName: userInfo.name || userInfo.preferred_username || 'User',
      userId: userInfo.sub,
      isAuthenticated: true
    };
  }
  
  /**
   * Clear user token from cache
   */
  public clearUserToken(userId: string): void {
    this.tokenCache.delete(userId);
  }
}

export default AuthService.getInstance();