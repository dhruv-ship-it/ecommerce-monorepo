/**
 * Authentication utilities for token validation and automatic logout
 */

export interface DecodedToken {
  id: number;
  email?: string;
  username?: string;
  role: string;
  userType: string;
  iat: number;
  exp: number;
}

/**
 * Decode JWT token without verification (client-side)
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Check if token is expired (with 5 minute buffer)
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  // Add 5 minute buffer (300 seconds) to prevent edge cases
  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < (now + 300);
}

/**
 * Get all possible token types for a user role
 */
export function getTokenKeys(): string[] {
  return ['su_token', 'admin_token', 'vendor_token', 'courier_token'];
}

/**
 * Get valid token for current user (returns first non-expired token found)
 */
export function getValidToken(): { token: string; key: string } | null {
  if (typeof window === 'undefined') return null;
  
  const tokenKeys = getTokenKeys();
  
  for (const key of tokenKeys) {
    const token = localStorage.getItem(key);
    if (token && !isTokenExpired(token)) {
      return { token, key };
    }
  }
  
  return null;
}

/**
 * Clear all authentication tokens
 */
export function clearAllTokens(): void {
  if (typeof window === 'undefined') return;
  
  const tokenKeys = getTokenKeys();
  tokenKeys.forEach(key => localStorage.removeItem(key));
  
  // Also clear customer token if exists
  localStorage.removeItem('token');
}

/**
 * Clear expired tokens and return valid token if any
 */
export function cleanupTokens(): { token: string; key: string } | null {
  if (typeof window === 'undefined') return null;
  
  const tokenKeys = getTokenKeys();
  let validToken: { token: string; key: string } | null = null;
  
  for (const key of tokenKeys) {
    const token = localStorage.getItem(key);
    if (token) {
      if (isTokenExpired(token)) {
        localStorage.removeItem(key);
        console.log(`Removed expired token: ${key}`);
      } else if (!validToken) {
        validToken = { token, key };
      }
    }
  }
  
  return validToken;
}

/**
 * Automatic logout function that clears tokens and redirects
 */
export function performAutoLogout(redirectPath: string = '/'): void {
  console.log('Performing automatic logout due to token expiration');
  clearAllTokens();
  
  // Redirect to login page
  if (typeof window !== 'undefined') {
    window.location.href = redirectPath;
  }
}

/**
 * Validate and refresh authentication state
 * Returns true if user is authenticated, false if logged out
 */
export function validateAuth(): boolean {
  const validToken = cleanupTokens();
  
  if (!validToken) {
    // No valid tokens found, user should be logged out
    return false;
  }
  
  return true;
}

/**
 * Get user info from valid token
 */
export function getUserFromToken(): DecodedToken | null {
  const validToken = getValidToken();
  if (!validToken) return null;
  
  return decodeToken(validToken.token);
}