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
      const response = await fetch("http://localhost:4000/api/user/profile", {
        headers: {
          Authorization: `Bearer ${validToken.token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data);
      } else if (response.status === 401) {
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
        <div className="text-xl">Loading...</div>
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
                EcomGM - Vendor Dashboard
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push('/vendor-dashboard/profile')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 mr-2"
              >
                Profile
              </button>
              <span className="text-sm text-gray-700 mr-4">
                Welcome, {user?.User || "Vendor"}
              </span>
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
                Vendor Dashboard
              </h3>
              
              <div className="mt-8">
                <h4 className="text-md font-medium text-gray-900 mb-4">Quick Actions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                    onClick={() => router.push('/vendor-dashboard/products')}
                  >
                    <h5 className="font-medium text-gray-900">Manage Products</h5>
                    <p className="text-sm text-gray-500">Add, edit, or remove products</p>
                  </button>
                  <button 
                    className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                    onClick={() => router.push('/vendor-dashboard/orders')}
                  >
                    <h5 className="font-medium text-gray-900">View Orders</h5>
                    <p className="text-sm text-gray-500">Track order status and fulfillment</p>
                  </button>
                  <button 
                    className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                    onClick={() => router.push('/vendor-dashboard/analytics')}
                  >
                    <h5 className="font-medium text-gray-900">Analytics</h5>
                    <p className="text-sm text-gray-500">View sales and performance data</p>
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