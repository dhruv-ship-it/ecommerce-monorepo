"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateAuth, performAutoLogout } from "@/utils/auth";

export default function EcomMGMLogin() {
  const [vendorCredentials, setVendorCredentials] = useState({ email: "", password: "" });
  const [courierCredentials, setCourierCredentials] = useState({ email: "", password: "" });
  const [vendorLoading, setVendorLoading] = useState(false);
  const [courierLoading, setCourierLoading] = useState(false);
  const [vendorError, setVendorError] = useState("");
  const [courierError, setCourierError] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showSuLogin, setShowSuLogin] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({ email: "", password: "" });
  const [suCredentials, setSuCredentials] = useState({ email: "", password: "" });
  const [adminLoading, setAdminLoading] = useState(false);
  const [suLoading, setSuLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [suError, setSuError] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Prevent hydration mismatch by ensuring component is mounted on client
  useEffect(() => {
    setMounted(true);
    
    // Check for expired tokens on page load
    if (!validateAuth()) {
      // Clear any remaining tokens and redirect if needed
      // Note: we don't redirect here as this is the login page
    }
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminError("");

    try {
      // Clear any existing tokens before login
      if (typeof window !== 'undefined') {
        localStorage.removeItem("token"); // customer portal token
        localStorage.removeItem("su_token");
        localStorage.removeItem("admin_token");
        localStorage.removeItem("vendor_token");
        localStorage.removeItem("courier_token");
      }
      
      const response = await fetch(`http://localhost:4000/api/auth/user-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: adminCredentials.email,
          password: adminCredentials.password,
          role: "admin"
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token based on login type
        if (typeof window !== 'undefined') {
          localStorage.setItem("admin_token", data.token);
          router.push("/admin-dashboard");
        }
      } else {
        setAdminError(data.message || "Login failed");
      }
    } catch (error) {
      console.error('Admin login error:', error);
      setAdminError("Network error. Please try again.");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleSuLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuLoading(true);
    setSuError("");

    try {
      // Clear any existing tokens before login
      if (typeof window !== 'undefined') {
        localStorage.removeItem("token"); // customer portal token
        localStorage.removeItem("su_token");
        localStorage.removeItem("admin_token");
        localStorage.removeItem("vendor_token");
        localStorage.removeItem("courier_token");
      }
      
      const response = await fetch(`http://localhost:4000/api/auth/su-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: suCredentials.email,
          password: suCredentials.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token based on login type
        if (typeof window !== 'undefined') {
          localStorage.setItem("su_token", data.token);
          router.push("/su-dashboard");
        }
      } else {
        setSuError(data.message || "Login failed");
      }
    } catch (error) {
      console.error('SU login error:', error);
      setSuError("Network error. Please try again.");
    } finally {
      setSuLoading(false);
    }
  };

  const handleVendorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setVendorLoading(true);
    setVendorError("");

    try {
      // Clear any existing tokens before login
      if (typeof window !== 'undefined') {
        localStorage.removeItem("token"); // customer portal token
        localStorage.removeItem("su_token");
        localStorage.removeItem("admin_token");
        localStorage.removeItem("vendor_token");
        localStorage.removeItem("courier_token");
      }
      
      const response = await fetch(`http://localhost:4000/api/auth/user-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: vendorCredentials.email,
          password: vendorCredentials.password,
          role: "vendor"
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token based on login type
        if (typeof window !== 'undefined') {
          localStorage.setItem("vendor_token", data.token);
          router.push("/vendor-dashboard");
        }
      } else {
        setVendorError(data.message || "Login failed");
      }
    } catch (error) {
      console.error('Vendor login error:', error);
      setVendorError("Network error. Please try again.");
    } finally {
      setVendorLoading(false);
    }
  };

  const handleCourierLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCourierLoading(true);
    setCourierError("");

    try {
      // Clear any existing tokens before login
      if (typeof window !== 'undefined') {
        localStorage.removeItem("token"); // customer portal token
        localStorage.removeItem("su_token");
        localStorage.removeItem("admin_token");
        localStorage.removeItem("vendor_token");
        localStorage.removeItem("courier_token");
      }
      
      const response = await fetch(`http://localhost:4000/api/auth/user-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: courierCredentials.email,
          password: courierCredentials.password,
          role: "courier"
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token based on login type
        if (typeof window !== 'undefined') {
          localStorage.setItem("courier_token", data.token);
          router.push("/courier-dashboard");
        }
      } else {
        setCourierError(data.message || "Login failed");
      }
    } catch (error) {
      console.error('Courier login error:', error);
      setCourierError("Network error. Please try again.");
    } finally {
      setCourierLoading(false);
    }
  };

  // Prevent hydration mismatch by only rendering after client mount
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Right Navigation */}
      <div className="absolute top-4 right-4 flex space-x-2">
        <button
          onClick={() => {
            setShowAdminLogin(true);
            setShowSuLogin(false);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Admin Login
        </button>
        <button
          onClick={() => {
            setShowSuLogin(true);
            setShowAdminLogin(false);
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          SU Login
        </button>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl w-full space-y-8">
          {/* Admin Login Modal */}
          {showAdminLogin && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Admin Login</h2>
                  <button 
                    onClick={() => setShowAdminLogin(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleAdminLogin}>
                  <div className="mb-4">
                    <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      id="admin-email"
                      name="email"
                      type="email"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      placeholder="Email address"
                      value={adminCredentials.email}
                      onChange={(e) =>
                        setAdminCredentials({ ...adminCredentials, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      id="admin-password"
                      name="password"
                      type="password"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      placeholder="Password"
                      value={adminCredentials.password}
                      onChange={(e) =>
                        setAdminCredentials({ ...adminCredentials, password: e.target.value })
                      }
                    />
                  </div>
                  {adminError && (
                    <div className="text-red-600 text-sm mb-2">{adminError}</div>
                  )}
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      disabled={adminLoading}
                      className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {adminLoading ? "Signing in..." : "Sign in as Admin"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAdminLogin(false)}
                      className="py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* SU Login Modal */}
          {showSuLogin && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Super User Login</h2>
                  <button 
                    onClick={() => setShowSuLogin(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSuLogin}>
                  <div className="mb-4">
                    <label htmlFor="su-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      id="su-email"
                      name="email"
                      type="email"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                      placeholder="Email address"
                      value={suCredentials.email}
                      onChange={(e) =>
                        setSuCredentials({ ...suCredentials, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="su-password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      id="su-password"
                      name="password"
                      type="password"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                      placeholder="Password"
                      value={suCredentials.password}
                      onChange={(e) =>
                        setSuCredentials({ ...suCredentials, password: e.target.value })
                      }
                    />
                  </div>
                  {suError && (
                    <div className="text-red-600 text-sm mb-2">{suError}</div>
                  )}
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      disabled={suLoading}
                      className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                      {suLoading ? "Signing in..." : "Sign in as SU"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSuLogin(false)}
                      className="py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Main Login Content - Vendor and Courier */}
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">EcomMGM</h1>
            <p className="mt-2 text-gray-600">Sign in to your account</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Vendor Login */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Vendor Login</h2>
              <form onSubmit={handleVendorLogin} className="space-y-4">
                <div>
                  <label htmlFor="vendor-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="vendor-email"
                    name="email"
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
                    placeholder="Email address"
                    value={vendorCredentials.email}
                    onChange={(e) =>
                      setVendorCredentials({ ...vendorCredentials, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label htmlFor="vendor-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="vendor-password"
                    name="password"
                    type="password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
                    placeholder="Password"
                    value={vendorCredentials.password}
                    onChange={(e) =>
                      setVendorCredentials({ ...vendorCredentials, password: e.target.value })
                    }
                  />
                </div>
                {vendorError && (
                  <div className="text-red-600 text-sm">{vendorError}</div>
                )}
                <button
                  type="submit"
                  disabled={vendorLoading}
                  className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {vendorLoading ? "Signing in..." : "Sign in as Vendor"}
                </button>
              </form>
            </div>

            {/* Courier Login */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Courier Login</h2>
              <form onSubmit={handleCourierLogin} className="space-y-4">
                <div>
                  <label htmlFor="courier-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="courier-email"
                    name="email"
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
                    placeholder="Email address"
                    value={courierCredentials.email}
                    onChange={(e) =>
                      setCourierCredentials({ ...courierCredentials, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label htmlFor="courier-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="courier-password"
                    name="password"
                    type="password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
                    placeholder="Password"
                    value={courierCredentials.password}
                    onChange={(e) =>
                      setCourierCredentials({ ...courierCredentials, password: e.target.value })
                    }
                  />
                </div>
                {courierError && (
                  <div className="text-red-600 text-sm">{courierError}</div>
                )}
                <button
                  type="submit"
                  disabled={courierLoading}
                  className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                >
                  {courierLoading ? "Signing in..." : "Sign in as Courier"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}