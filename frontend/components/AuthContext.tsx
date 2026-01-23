'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { validateCustomerAuth, getCustomerFromToken, DecodedToken } from '@/utils/auth';

interface AuthContextType {
  isLoggedIn: boolean;
  customer: DecodedToken | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customer, setCustomer] = useState<DecodedToken | null>(null);

  // Function to update auth state
  const updateAuthState = () => {
    const authenticated = validateCustomerAuth();
    setIsLoggedIn(authenticated);
    
    if (authenticated) {
      const customerData = getCustomerFromToken();
      setCustomer(customerData);
    } else {
      setCustomer(null);
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    updateAuthState();
    
    // Listen for storage events to sync auth state across tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        updateAuthState();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = () => {
    updateAuthState();
  };

  const logout = () => {
    updateAuthState();
  };

  const value = {
    isLoggedIn,
    customer,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}