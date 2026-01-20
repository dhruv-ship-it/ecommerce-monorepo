"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [adminCredentials, setAdminCredentials] = useState({ email: "", password: "" });
  const [suCredentials, setSuCredentials] = useState({ email: "", password: "" });
  const [vendorCredentials, setVendorCredentials] = useState({ email: "", password: "" });
  const [courierCredentials, setCourierCredentials] = useState({ email: "", password: "" });
  const [adminError, setAdminError] = useState("");
  const [suError, setSuError] = useState("");
  const [vendorError, setVendorError] = useState("");
  const [courierError, setCourierError] = useState("");
  const router = useRouter();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    try {
      const response = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminCredentials.email,
          password: adminCredentials.password,
          role: "admin"
        }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("admin_token", JSON.stringify(data));
        router.push("/admin-dashboard");
      } else {
        setAdminError(data.error || "Login failed");
      }
    } catch (error) {
      setAdminError("Network error. Please try again.");
    }
  };

  const handleSuLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuError("");
    try {
      const response = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: suCredentials.email,
          password: suCredentials.password,
          role: "su"
        }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("su_token", JSON.stringify(data));
        router.push("/su-dashboard");
      } else {
        setSuError(data.error || "Login failed");
      }
    } catch (error) {
      setSuError("Network error. Please try again.");
    }
  };

  const handleVendorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setVendorError("");
    try {
      const response = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: vendorCredentials.email,
          password: vendorCredentials.password,
          role: "vendor"
        }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("vendor_token", JSON.stringify(data));
        router.push("/vendor-dashboard");
      } else {
        setVendorError(data.error || "Login failed");
      }
    } catch (error) {
      setVendorError("Network error. Please try again.");
    }
  };

  const handleCourierLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCourierError("");
    try {
      const response = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: courierCredentials.email,
          password: courierCredentials.password,
          role: "courier"
        }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("courier_token", JSON.stringify(data));
        router.push("/courier-dashboard");
      } else {
        setCourierError(data.error || "Login failed");
      }
    } catch (error) {
      setCourierError("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
        {/* Admin and SU Login Section (Top Right) */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Admin Login</h2>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={adminCredentials.email}
                  onChange={(e) => setAdminCredentials({...adminCredentials, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={adminCredentials.password}
                  onChange={(e) => setAdminCredentials({...adminCredentials, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              {adminError && <div className="text-red-600 text-sm">{adminError}</div>}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Login as Admin
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Super User Login</h2>
            <form onSubmit={handleSuLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={suCredentials.email}
                  onChange={(e) => setSuCredentials({...suCredentials, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={suCredentials.password}
                  onChange={(e) => setSuCredentials({...suCredentials, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              {suError && <div className="text-red-600 text-sm">{suError}</div>}
              <button
                type="submit"
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                Login as Super User
              </button>
            </form>
          </div>
        </div>

        {/* Vendor and Courier Login Section (Center) */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Vendor Login</h2>
            <form onSubmit={handleVendorLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={vendorCredentials.email}
                  onChange={(e) => setVendorCredentials({...vendorCredentials, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={vendorCredentials.password}
                  onChange={(e) => setVendorCredentials({...vendorCredentials, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              {vendorError && <div className="text-red-600 text-sm">{vendorError}</div>}
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Login as Vendor
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Courier Login</h2>
            <form onSubmit={handleCourierLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={courierCredentials.email}
                  onChange={(e) => setCourierCredentials({...courierCredentials, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={courierCredentials.password}
                  onChange={(e) => setCourierCredentials({...courierCredentials, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              {courierError && <div className="text-red-600 text-sm">{courierError}</div>}
              <button
                type="submit"
                className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                Login as Courier
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}