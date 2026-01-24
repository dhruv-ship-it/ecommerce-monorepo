"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateAuth, performAutoLogout, getValidToken } from "@/utils/auth";

interface UserProfile {
  SUId: number;
  SU: string;
  Passwd: string;
  IsBlackListed: string;
  IsDead: string;
  IsDeleted: string;
  RecordCreationTimeStamp: string;
  RecordCreationLogin: string;
  LastUpdationTimeStamp: string;
  LastUpdationLogin: string;
}

export default function SUProfile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  
  // Password change state
  const [changingPassword, setChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
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
        
        // Use SU profile endpoint instead of user profile endpoint
        const response = await fetch("http://localhost:4000/su/profile", {
          headers: {
            Authorization: `Bearer ${validToken.token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          // Set form values
          setName(data.user.SU || "");
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }
      
      // Use SU profile endpoint for updates
      const response = await fetch("http://localhost:4000/su/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken.token}`,
        },
        body: JSON.stringify({
          name: name || undefined,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message || "Profile updated successfully");
        // Update the user state with new values
        if (user) {
          setUser({
            ...user,
            SU: name || user.SU,
          });
        }
        setEditing(false);
      } else if (response.status === 401) {
        performAutoLogout("/");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setError("Failed to update profile: " + (error?.message || "Unknown error"));
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    
    setUpdating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }
      
      // Use SU password endpoint for password changes
      const response = await fetch("http://localhost:4000/su/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken.token}`,
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message || "Password updated successfully");
        // Reset password fields
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setChangingPassword(false);
      } else if (response.status === 401) {
        performAutoLogout("/");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update password");
      }
    } catch (error: any) {
      console.error("Error updating password:", error);
      setError("Failed to update password: " + (error?.message || "Unknown error"));
    } finally {
      setUpdating(false);
    }
  };

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
                EcomMGM - SU Dashboard
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push('/su-dashboard')}
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
                  Super User Profile
                </h3>
              </div>
              
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              
              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}
              
              {!editing && !changingPassword ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-900">Username</label>
                      <p className="mt-1 text-sm text-gray-900">{user?.SU || "N/A"}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900">Account ID</label>
                      <p className="mt-1 text-sm text-gray-900">{user?.SUId || "N/A"}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900">Account Status</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {user?.IsBlackListed === 'Y' ? 'Blacklisted' : 'Active'} 
                        {user?.IsDead === 'Y' ? ', Deactivated' : ''}
                        {user?.IsDeleted === 'Y' ? ', Deleted' : ''}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900">Is Blacklisted</label>
                      <p className="mt-1 text-sm text-gray-900">{user?.IsBlackListed || "N/A"}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900">Is Dead</label>
                      <p className="mt-1 text-sm text-gray-900">{user?.IsDead || "N/A"}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900">Is Deleted</label>
                      <p className="mt-1 text-sm text-gray-900">{user?.IsDeleted || "N/A"}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900">Created At</label>
                      <p className="mt-1 text-sm text-gray-900">{user?.RecordCreationTimeStamp || "N/A"}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900">Created By</label>
                      <p className="mt-1 text-sm text-gray-900">{user?.RecordCreationLogin || "N/A"}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900">Last Updated</label>
                      <p className="mt-1 text-sm text-gray-900">{user?.LastUpdationTimeStamp || "N/A"}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900">Updated By</label>
                      <p className="mt-1 text-sm text-gray-900">{user?.LastUpdationLogin || "N/A"}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-6">
                    <button
                      onClick={() => router.push('/su-dashboard/profile/edit')}  // Navigate to edit page instead of inline editing
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Edit Profile
                    </button>
                  </div>
                </div>
              ) : editing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Username</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        // Reset form values to original
                        if (user) {
                          setName(user.SU || "");
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      disabled={updating}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updating}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      {updating && (
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      {updating ? "Updating..." : "Update Profile"}
                    </button>
                  </div>
                </form>
              ) : changingPassword ? (
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Old Password</label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border text-gray-900 bg-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border text-gray-900 bg-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setChangingPassword(false);
                        // Reset password fields
                        setOldPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      disabled={updating}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updating}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                    >
                      {updating && (
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      {updating ? "Updating..." : "Change Password"}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}