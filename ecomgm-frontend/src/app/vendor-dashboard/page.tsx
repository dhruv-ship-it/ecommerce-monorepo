"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { validateAuth, performAutoLogout, getValidToken } from "@/utils/auth";

interface User {
  UserId: number;
  User: string;
  UserEmail: string;
  UserMobile: string;
  IsVendor: string;
  IsActivated: string;
}

export default function VendorDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUserProfile = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    // Validate auth before making request
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    const validToken = getValidToken();
    if (!validToken) {
      performAutoLogout("/");
      return;
    }
    
    try {
      // Fetch user profile
      const profileResponse = await fetch("http://localhost:4000/api/user/profile", {
        headers: {
          Authorization: `Bearer ${validToken.token}`,
        },
      });
      const profileData = await profileResponse.json();
      if (profileResponse.ok) {
        setUser(profileData);
      } else if (profileResponse.status === 401) {
        // Token expired or invalid
        performAutoLogout("/");
        return;
      }
      

    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Validate authentication on page load
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    const validToken = getValidToken();
    if (!validToken) {
      performAutoLogout("/");
      return;
    }
    
    fetchUserProfile();
  }, [router, fetchUserProfile, mounted]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("vendor_token");
    }
    router.push("/");
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xl">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                EcomMGM - Vendor Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.User || "Vendor"}
              </span>
              <button
                onClick={() => router.push('/vendor-dashboard/profile')}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                <span className="text-blue-600 font-bold">Vendor Dashboard</span>
              </h3>
              

              
              <div className="mt-8">
                <h4 className="text-md font-medium text-gray-900 mb-4 text-blue-600">Order Management</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    className="p-4 border border-blue-300 rounded-lg hover:bg-blue-50 text-left flex items-center bg-blue-50"
                    onClick={() => router.push('/vendor-dashboard/products')}
                  >
                    <div className="mr-3">
                      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-medium text-blue-900">Manage Products</h5>
                      <p className="text-sm text-blue-700">Add, edit, or remove products</p>
                    </div>
                  </button>
                  <button 
                    className="p-4 border border-blue-300 rounded-lg hover:bg-blue-50 text-left flex items-center bg-blue-50"
                    onClick={() => router.push('/vendor-dashboard/orders')}
                  >
                    <div className="mr-3">
                      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-medium text-blue-900">View Orders</h5>
                      <p className="text-sm text-blue-700">Track order status and fulfillment</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}