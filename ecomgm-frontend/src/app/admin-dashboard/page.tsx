"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { validateAuth, performAutoLogout, getValidToken } from "@/utils/auth";

interface User {
  UserId: number;
  User: string;
  UserEmail: string;
  UserMobile: string;
  IsAdmin: string;
  IsActivated: string;
}

export default function AdminDashboard() {
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
      localStorage.removeItem("admin_token");
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
                SmartKartMGM - Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.User || "Admin"}
              </span>
              <button
                onClick={() => router.push('/admin-dashboard/profile')}
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
                <span className="text-blue-600 font-bold">Admin Dashboard</span>
              </h3>

              
              <div className="mt-8">
                <h4 className="text-md font-medium text-gray-900 mb-4 text-blue-600">Admin Management and Actions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => router.push('/admin-dashboard/users')}
                    className="p-4 border border-blue-300 rounded-lg hover:bg-blue-50 text-left cursor-pointer bg-blue-50"
                  >
                    <h5 className="font-medium text-blue-900">Manage Users</h5>
                    <p className="text-sm text-blue-700">Create and manage admin, vendor, courier accounts</p>
                  </button>
                  <button 
                    onClick={() => router.push('/admin-dashboard/orders')}
                    className="p-4 border border-blue-300 rounded-lg hover:bg-blue-50 text-left cursor-pointer bg-blue-50"
                  >
                    <h5 className="font-medium text-blue-900">View Orders</h5>
                    <p className="text-sm text-blue-700">Monitor order status and tracking</p>
                  </button>
                  <button 
                    onClick={() => router.push('/admin-dashboard/manage-tables')}
                    className="p-4 border border-blue-300 rounded-lg hover:bg-blue-50 text-left cursor-pointer bg-blue-50"
                  >
                    <h5 className="font-medium text-blue-900">Manage Tables</h5>
                    <p className="text-sm text-blue-700">Add or edit database tables</p>
                  </button>
                  <button 
                    onClick={() => router.push('/admin-dashboard/reports')}
                    className="p-4 border border-blue-300 rounded-lg hover:bg-blue-50 text-left cursor-pointer bg-blue-50"
                  >
                    <h5 className="font-medium text-blue-900">Reports</h5>
                    <p className="text-sm text-blue-700">View analytics and reports</p>
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