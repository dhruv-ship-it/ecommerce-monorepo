"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateAuth, performAutoLogout, getValidToken } from "@/utils/auth";

interface Locality {
  LocalityId: number;
  Locality: string;
}

export default function CreateUserPage() {
  const [createData, setCreateData] = useState({
    name: "", gender: "", mobile: "", email: "", pin: "", dob: "", address: "", password: "", role: "admin",
    isVerified: "Y", isActivated: "Y", locality: 0, rank: 0
  });
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Validate authentication on page load
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    // Fetch localities
    fetchLocalities();
  }, []);
  
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:4000/su/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("su_token")}`,
        },
        body: JSON.stringify({
          ...createData,
          isVerified: createData.isVerified,
          isActivated: createData.isActivated,
          locality: createData.locality,
          rank: createData.rank
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setCreateSuccess("User created successfully!");
        setCreateData({ name: "", gender: "", mobile: "", email: "", pin: "", dob: "", address: "", password: "", role: "admin", isVerified: "Y", isActivated: "Y", locality: 0, rank: 0 });
      } else {
        setCreateError(data.error || "Failed to create user");
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setCreateError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                SmartKartMGM - SU Dashboard
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/su-dashboard")}
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
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 text-blue-600">
                <span className="text-blue-600 font-bold">Create User (Admin, Vendor, Courier)</span>
              </h3>
              
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={createData.name}
                      onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <select
                      value={createData.gender}
                      onChange={(e) => setCreateData({ ...createData, gender: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mobile</label>
                    <input
                      type="text"
                      value={createData.mobile}
                      onChange={(e) => setCreateData({ ...createData, mobile: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={createData.email}
                      onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PIN</label>
                    <input
                      type="text"
                      value={createData.pin}
                      onChange={(e) => setCreateData({ ...createData, pin: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <input
                      type="date"
                      value={createData.dob}
                      onChange={(e) => setCreateData({ ...createData, dob: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <input
                      type="text"
                      value={createData.address}
                      onChange={(e) => setCreateData({ ...createData, address: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Locality</label>
                    <select
                      value={createData.locality}
                      onChange={(e) => setCreateData({ ...createData, locality: parseInt(e.target.value) || 0 })}
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
                      value={createData.rank}
                      onChange={(e) => setCreateData({ ...createData, rank: parseInt(e.target.value) || 0 })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                      type="password"
                      value={createData.password}
                      onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select
                      value={createData.role}
                      onChange={(e) => setCreateData({ ...createData, role: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    >
                      <option value="admin">Admin</option>
                      <option value="vendor">Vendor</option>
                      <option value="courier">Courier</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Verified</label>
                    <select
                      value={createData.isVerified}
                      onChange={(e) => setCreateData({ ...createData, isVerified: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    >
                      <option value="Y">Yes</option>
                      <option value="">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Activated</label>
                    <select
                      value={createData.isActivated}
                      onChange={(e) => setCreateData({ ...createData, isActivated: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    >
                      <option value="Y">Yes</option>
                      <option value="">No</option>
                    </select>
                  </div>
                </div>
                
                {createError && <div className="text-red-600 text-sm">{createError}</div>}
                {createSuccess && <div className="text-green-600 text-sm">{createSuccess}</div>}
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => router.push("/su-dashboard")}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-auto bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "Create User"}
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