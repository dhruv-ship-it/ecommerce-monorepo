"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { validateAuth, performAutoLogout, getValidToken } from "@/utils/auth";

interface User {
  UserId: number;
  User: string;
  Gender: string;
  UserMobile: string;
  UserEmail: string;
  PIN: string;
  Locality: number;
  DoB: string;
  UserRank: number;
  Passwd: string;
  Address: string;
  IsSU: string;
  IsAdmin: string;
  IsVendor: string;
  IsCourier: string;
  IsVerified: string;
  VerificationTimeStamp: string;
  IsActivated: string;
  ActivationTimeStamp: string;
  IsBlackListed: string;
  BlackListTimeStamp: string;
  IsDead: string;
  DeadTimeStamp: string;
  IsDeleted: string;
  RecordCreationTimeStamp: string;
  RecordCreationLogin: string;
  LastUpdationTimeStamp: string;
  LastUpdationLogin: string;
}

interface Locality {
  LocalityId: number;
  Locality: string;
}

export default function EditUserPage() {
  const [user, setUser] = useState<User | null>(null);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [formData, setFormData] = useState({
    name: '', gender: '', mobile: '', email: '', pin: '', locality: 0, dob: '', rank: 0, address: '',
    isSU: '', isAdmin: '', isVendor: '', isCourier: '', isVerified: '', isActivated: '', isBlackListed: '', isDead: '',
    verificationTimeStamp: '', activationTimeStamp: '', blackListTimeStamp: '', deadTimeStamp: '', recordCreationTimeStamp: '',
    recordCreationLogin: '', lastUpdationTimeStamp: '', lastUpdationLogin: '', isDeleted: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const params = useParams(); // { id: string }

  useEffect(() => {
    // Validate authentication on page load
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    fetchUserData();
    fetchLocalities();
  }, []);

  useEffect(() => {
    if (user) {
      console.log('Setting form data with user.Locality:', user.Locality, 'Type:', typeof user.Locality);
      const localityValue = user.Locality || 0;
      console.log('Final locality value:', localityValue, 'Type:', typeof localityValue);
      
      setFormData({
        name: user.User,
        gender: user.Gender,
        mobile: user.UserMobile,
        email: user.UserEmail,
        pin: user.PIN,
        locality: localityValue,
        dob: user.DoB,
        rank: user.UserRank || 0,
        address: user.Address,
        isSU: user.IsSU,
        isAdmin: user.IsAdmin,
        isVendor: user.IsVendor,
        isCourier: user.IsCourier,
        isVerified: user.IsVerified,
        isActivated: user.IsActivated,
        isBlackListed: user.IsBlackListed,
        isDead: user.IsDead,
        verificationTimeStamp: user.VerificationTimeStamp,
        activationTimeStamp: user.ActivationTimeStamp,
        blackListTimeStamp: user.BlackListTimeStamp,
        deadTimeStamp: user.DeadTimeStamp,
        recordCreationTimeStamp: user.RecordCreationTimeStamp,
        recordCreationLogin: user.RecordCreationLogin,
        lastUpdationTimeStamp: user.LastUpdationTimeStamp,
        lastUpdationLogin: user.LastUpdationLogin,
        isDeleted: user.IsDeleted
      });
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }

      const userId = params.id;
      const response = await fetch(`http://localhost:4000/admin/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${validToken.token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else if (response.status === 401) {
        performAutoLogout("/");
      } else {
        setError("Failed to fetch user data");
      }
    } catch (err) {
      console.error("Error fetching user:", err);
      setError("Error fetching user data");
    } finally {
      setLoading(false);
    }
  };

  const fetchLocalities = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/localities");
      if (response.ok) {
        const data = await response.json();
        // Define type for incoming data
        interface ApiLocality {
          id: number;
          name: string;
        }
        const localitiesArray = Array.isArray(data.localities) ? data.localities : [];
        // Transform the API response to match the Locality interface
        const transformedLocalities: Locality[] = localitiesArray.map((loc: ApiLocality) => ({
          LocalityId: loc.id,
          Locality: loc.name
        }));
        setLocalities(transformedLocalities);
      }
    } catch (err) {
      console.error("Error fetching localities:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }

      const response = await fetch(`http://localhost:4000/admin/user/${user?.UserId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken.token}`,
        },
        body: JSON.stringify({
          User: formData.name,
          Gender: formData.gender,
          UserMobile: formData.mobile,
          UserEmail: formData.email,
          PIN: formData.pin,
          Locality: formData.locality,
          DoB: formData.dob,
          UserRank: formData.rank,
          Address: formData.address,
          IsSU: formData.isSU,
          IsAdmin: formData.isAdmin,
          IsVendor: formData.isVendor,
          IsCourier: formData.isCourier,
          IsVerified: formData.isVerified,
          IsActivated: formData.isActivated,
          IsBlackListed: formData.isBlackListed,
          IsDead: formData.isDead,
          // Note: Password is not updated through this form
          // Timestamps and login info are automatically managed by the database
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess("User updated successfully!");
      } else {
        setError(data.error || "Failed to update user");
      }
    } catch (err) {
      console.error("Error updating user:", err);
      setError("Network error. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
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
                  onClick={() => router.push("/admin-dashboard/view-users")}
                  className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Back to Users
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
                  <p className="mt-1 text-sm text-gray-500">User not found</p>
                  <div className="mt-6">
                    <button
                      onClick={() => router.push("/admin-dashboard/view-users")}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Back to Users
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
                onClick={() => router.push("/admin-dashboard/view-users")}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Back to Users
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6 text-blue-600">
                Edit User: {user.User}
              </h3>

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

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mobile</label>
                    <input
                      type="text"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PIN</label>
                    <input
                      type="text"
                      value={formData.pin}
                      onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Locality</label>
                    <select
                      value={formData.locality}
                      onChange={(e) => setFormData({ ...formData, locality: parseInt(e.target.value) || 0 })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      disabled={localities.length === 0}
                    >
                      <option value="0" className="text-gray-700 bg-white">{localities.length === 0 ? 'Loading...' : 'Select Locality'}</option>
                      {localities.map(locality => (
                        <option key={locality.LocalityId} value={locality.LocalityId} className="text-gray-900 bg-white">
                          {locality.Locality}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rank</label>
                    <input
                      type="number"
                      value={formData.rank}
                      onChange={(e) => setFormData({ ...formData, rank: parseInt(e.target.value) || 0 })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="border-t pt-6 mt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Record Creation Time</label>
                      <input
                        type="text"
                        value={user?.RecordCreationTimeStamp || ''}
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Record Creation Login</label>
                      <input
                        type="text"
                        value={user?.RecordCreationLogin || ''}
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Update Time</label>
                      <input
                        type="text"
                        value={user?.LastUpdationTimeStamp || ''}
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Update Login</label>
                      <input
                        type="text"
                        value={user?.LastUpdationLogin || ''}
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Verification Time</label>
                      <input
                        type="text"
                        value={user?.VerificationTimeStamp || ''}
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Activation Time</label>
                      <input
                        type="text"
                        value={user?.ActivationTimeStamp || ''}
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Blacklist Time</label>
                      <input
                        type="text"
                        value={user?.BlackListTimeStamp || ''}
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Death Time</label>
                      <input
                        type="text"
                        value={user?.DeadTimeStamp || ''}
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Is SU</label>
                    <select
                      value={formData.isSU}
                      onChange={(e) => setFormData({ ...formData, isSU: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Unset</option>
                      <option value="Y">Yes</option>
                      <option value="N">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Is Admin</label>
                    <select
                      value={formData.isAdmin}
                      onChange={(e) => setFormData({ ...formData, isAdmin: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Unset</option>
                      <option value="Y">Yes</option>
                      <option value="N">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Is Vendor</label>
                    <select
                      value={formData.isVendor}
                      onChange={(e) => setFormData({ ...formData, isVendor: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Unset</option>
                      <option value="Y">Yes</option>
                      <option value="N">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Is Courier</label>
                    <select
                      value={formData.isCourier}
                      onChange={(e) => setFormData({ ...formData, isCourier: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Unset</option>
                      <option value="Y">Yes</option>
                      <option value="N">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Is Verified</label>
                    <select
                      value={formData.isVerified}
                      onChange={(e) => setFormData({ ...formData, isVerified: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Unset</option>
                      <option value="Y">Yes</option>
                      <option value="N">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Is Activated</label>
                    <select
                      value={formData.isActivated}
                      onChange={(e) => setFormData({ ...formData, isActivated: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Unset</option>
                      <option value="Y">Yes</option>
                      <option value="N">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Is BlackListed</label>
                    <select
                      value={formData.isBlackListed}
                      onChange={(e) => setFormData({ ...formData, isBlackListed: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Unset</option>
                      <option value="Y">Yes</option>
                      <option value="N">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Is Dead</label>
                    <select
                      value={formData.isDead}
                      onChange={(e) => setFormData({ ...formData, isDead: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Unset</option>
                      <option value="Y">Yes</option>
                      <option value="N">No</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => router.push("/admin-dashboard/view-users")}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
