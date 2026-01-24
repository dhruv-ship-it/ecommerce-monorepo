"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateAuth, performAutoLogout, getValidToken } from "@/utils/auth";

interface UserProfile {
  UserId: number;
  User: string;
  UserEmail: string;
  UserMobile: string;
  Gender: string;
  DoB: string;
  Address: string;
  Locality: number;
  UserRank: number;
  IsAdmin: string;
  IsActivated: string;
  IsVerified: string;
  IsBlackListed: string;
  PIN: string;
}

interface Locality {
  LocalityId: number;
  Locality: string;
}

export default function AdminProfile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [localityName, setLocalityName] = useState<string>("N/A");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    // Validate authentication on page load
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    const fetchUserProfile = async () => {
      try {
        const validToken = getValidToken();
        if (!validToken) {
          performAutoLogout("/");
          return;
        }
        
        const response = await fetch("http://localhost:4000/api/user/profile", {
          headers: {
            Authorization: `Bearer ${validToken.token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          // Fetch locality name if locality ID exists
          if (data.user.Locality && data.user.Locality > 0) {
            const localityResponse = await fetch(`http://localhost:4000/api/locality/${data.user.Locality}`, {
              headers: {
                Authorization: `Bearer ${validToken.token}`,
              },
            });
            
            if (localityResponse.ok) {
              const localityData = await localityResponse.json();
              setLocalityName(localityData.locality?.Locality || "N/A");
            } else {
              setLocalityName("N/A");
            }
          } else {
            setLocalityName("N/A");
          }
        } else if (response.status === 401) {
          performAutoLogout("/");
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Failed to fetch profile");
        }
      } catch (error: any) {
        console.error("Error fetching user profile:", error);
        setError("Failed to fetch profile: " + (error?.message || "Unknown error"));
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xl">Loading profile...</span>
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
                SmartKartMGM - Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin-dashboard')}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Admin Profile
                </h3>
                <button
                  onClick={() => router.push('/admin-dashboard/profile/edit')}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Edit Profile
                </button>
              </div>
              
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.User || "N/A"}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.UserEmail || "N/A"}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Mobile</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.UserMobile || "N/A"}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Gender</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.Gender || "N/A"}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Date of Birth</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.DoB || "N/A"}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900">PIN</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.PIN || "N/A"}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Locality</label>
                    <p className="mt-1 text-sm text-gray-900">{localityName}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Rank</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.UserRank || "N/A"}</p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900">Address</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.Address || "N/A"}</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Account Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-700">Admin Status</h5>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {user?.IsAdmin === 'Y' ? 'Active Admin' : 'Not an Admin'}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-700">Account Status</h5>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {user?.IsActivated === 'Y' ? 'Activated' : 'Not Activated'}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-700">Verification</h5>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {user?.IsVerified === 'Y' ? 'Verified' : 'Not Verified'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-6">
                  <button
                    onClick={() => router.push('/admin-dashboard/profile/edit')}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                  >
                    Change Password
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