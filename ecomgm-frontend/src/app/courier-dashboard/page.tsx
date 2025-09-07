"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { validateAuth, performAutoLogout, getValidToken } from "@/utils/auth";

interface User {
  UserId: number;
  User: string;
  UserEmail: string;
  UserMobile: string;
  IsCourier: string;
  IsActivated: string;
}

export default function CourierDashboard() {
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
      localStorage.removeItem("courier_token");
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
                EcomGM - Courier Dashboard
              </h1>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">
                Welcome, {user?.User || "Courier"}
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
      
      {/* Sidebar */}
      <div className="bg-gray-100 min-h-screen w-64 fixed top-16 left-0 pt-6 pb-4">
        <div className="px-4 space-y-6">
          <div className="flex flex-col space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Navigation
            </h2>
            <button
              onClick={() => router.push('/courier-dashboard')}
              className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-md"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push('/courier-dashboard/orders')}
              className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-md"
            >
              Orders for Acceptance
            </button>
            <button
              onClick={() => router.push('/courier-dashboard/assigned')}
              className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-md"
            >
              Assigned Deliveries
            </button>
            <button
              onClick={() => router.push('/courier-dashboard/tracking')}
              className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-md"
            >
              Tracking Updates
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8" style={{marginLeft: "16rem"}}>
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Courier Dashboard
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800">Pending Deliveries</h4>
                  <p className="text-2xl font-bold text-blue-900">0</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-green-800">Completed Today</h4>
                  <p className="text-2xl font-bold text-green-900">0</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-purple-800">Total Delivered</h4>
                  <p className="text-2xl font-bold text-purple-900">0</p>
                </div>
              </div>
              
              <div className="mt-8">
                <h4 className="text-md font-medium text-gray-900 mb-4">Quick Actions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                    onClick={() => router.push('/courier-dashboard/orders')}
                  >
                    <h5 className="font-medium text-gray-900">View Orders</h5>
                    <p className="text-sm text-gray-500">See assigned delivery orders</p>
                  </button>
                  <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
                    <h5 className="font-medium text-gray-900">Update Status</h5>
                    <p className="text-sm text-gray-500">Mark orders as delivered</p>
                  </button>
                  <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
                    <h5 className="font-medium text-gray-900">Route Map</h5>
                    <p className="text-sm text-gray-500">View delivery routes</p>
                  </button>
                  <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
                    <h5 className="font-medium text-gray-900">Delivery History</h5>
                    <p className="text-sm text-gray-500">View past deliveries</p>
                  </button>
                </div>
              </div>
              
              {/* New Orders Section */}
              <div className="mt-8">
                <h4 className="text-md font-medium text-gray-900 mb-4">New Orders</h4>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <p className="text-sm text-gray-500">No new orders available.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 