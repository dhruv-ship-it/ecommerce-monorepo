"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { validateAuth, performAutoLogout, getValidToken } from "@/utils/auth";

interface User {
  UserId: number;
  User: string;
  UserEmail: string;
  UserMobile: string;
  Gender: string;
  PIN: string;
  Locality: string;
  DoB: string;
  UserRank: string;
  Address: string;
  IsSU: string;
  IsAdmin: string;
  IsVendor: string;
  IsCourier: string;
  IsVerified: string;
  IsActivated: string;
  IsBlackListed: string;
  IsDead: string;
}

export default function CreateUserPage() {
  const [createData, setCreateData] = useState({
    name: "", gender: "", mobile: "", email: "", pin: "", dob: "", address: "", password: "", role: "admin",
    isVerified: "Y", isActivated: "Y"
  });
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const router = useRouter();

  // Helper function to get authenticated token
  const getAuthToken = (): string | null => {
    if (!validateAuth()) {
      performAutoLogout("/");
      return null;
    }
    
    const validToken = getValidToken();
    if (!validToken) {
      performAutoLogout("/");
      return null;
    }
    
    return validToken.token;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch("http://localhost:4000/admin/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...createData,
          isVerified: createData.isVerified,
          isActivated: createData.isActivated
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setCreateSuccess("User created successfully!");
        setCreateData({ name: "", gender: "", mobile: "", email: "", pin: "", dob: "", address: "", password: "", role: "admin", isVerified: "Y", isActivated: "Y" });
      } else {
        setCreateError(data.error || "Failed to create user");
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setCreateError("Network error. Please try again.");
    }
  };

  const handleCancel = () => {
    router.push("/admin-dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                EcomGM - Admin Dashboard - Create User
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/admin-dashboard")}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
              >
                Back to Admin Dashboard
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
                Create User (Admin, Vendor, Courier)
              </h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={createData.name}
                      onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <select
                      value={createData.gender}
                      onChange={(e) => setCreateData({ ...createData, gender: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={createData.email}
                      onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PIN</label>
                    <input
                      type="text"
                      value={createData.pin}
                      onChange={(e) => setCreateData({ ...createData, pin: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <input
                      type="date"
                      value={createData.dob}
                      onChange={(e) => setCreateData({ ...createData, dob: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <input
                      type="text"
                      value={createData.address}
                      onChange={(e) => setCreateData({ ...createData, address: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                      type="password"
                      value={createData.password}
                      onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select
                      value={createData.role}
                      onChange={(e) => setCreateData({ ...createData, role: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Y">Yes</option>
                      <option value="">No</option>
                    </select>
                  </div>
                </div>
                {createError && <div className="text-red-600 text-sm">{createError}</div>}
                {createSuccess && <div className="text-green-600 text-sm">{createSuccess}</div>}
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Create User
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cancel
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