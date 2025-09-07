/**
 * Authentication utilities for customer token validation and automatic logout
 */

export interface DecodedToken {
  id: number;
  email: string;
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
 * Get customer token from localStorage
 */
export function getCustomerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * Check if customer token is valid (exists and not expired)
 */
export function isCustomerAuthenticated(): boolean {
  const token = getCustomerToken();
  if (!token) return false;
  
  return !isTokenExpired(token);
}

/**
 * Clear customer authentication token
 */
export function clearCustomerToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
}

/**
 * Automatic logout function for customers
 */
export function performCustomerLogout(redirectPath: string = '/'): void {
  console.log('Performing automatic customer logout due to token expiration');
  clearCustomerToken();
  
  // Redirect to home page
  if (typeof window !== 'undefined') {
    window.location.href = redirectPath;
  }
}

/**
 * Validate customer authentication and perform cleanup
 * Returns true if authenticated, false if logged out
 */
export function validateCustomerAuth(): boolean {
  const token = getCustomerToken();
  
  if (!token) {
    return false;
  }
  
  if (isTokenExpired(token)) {
    console.log('Customer token expired, logging out');
    clearCustomerToken();
    return false;
  }
  
  return true;
}

/**
 * Get customer info from token
 */
export function getCustomerFromToken(): DecodedToken | null {
  const token = getCustomerToken();
  if (!token || isTokenExpired(token)) return null;
  
  return decodeToken(token);
}