"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateAuth, performAutoLogout } from "@/utils/auth";

export default function UnifiedLoginPage() {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [selectedRole, setSelectedRole] = useState<"vendor" | "courier" | "admin" | "su" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Check for existing session and redirect to appropriate dashboard
  useEffect(() => {
    setMounted(true);
    
    // Check for existing tokens and redirect accordingly
    if (typeof window !== 'undefined') {
      if (localStorage.getItem("admin_token")) {
        router.push("/admin-dashboard");
        return;
      }
      if (localStorage.getItem("vendor_token")) {
        router.push("/vendor-dashboard");
        return;
      }
      if (localStorage.getItem("courier_token")) {
        router.push("/courier-dashboard");
        return;
      }
      if (localStorage.getItem("su_token")) {
        router.push("/su-dashboard");
        return;
      }
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      setError("Please select a role to login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Clear any existing tokens before login
      if (typeof window !== 'undefined') {
        localStorage.removeItem("token"); // customer portal token
        localStorage.removeItem("su_token");
        localStorage.removeItem("admin_token");
        localStorage.removeItem("vendor_token");
        localStorage.removeItem("courier_token");
      }

      let response;
      let endpoint;
      let requestBody;

      if (selectedRole === "su") {
        // For SU login, the email field is actually the name
        endpoint = `http://localhost:4000/api/auth/su-login`;
        requestBody = {
          email: credentials.email, // This will be the SU name
          password: credentials.password,
        };
      } else {
        // For admin, vendor, courier - use user-login endpoint
        endpoint = `http://localhost:4000/api/auth/user-login`;
        requestBody = {
          email: credentials.email,
          password: credentials.password,
          role: selectedRole
        };
      }

      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token based on login type
        if (typeof window !== 'undefined') {
          if (selectedRole === "admin") {
            localStorage.setItem("admin_token", data.token);
            router.push("/admin-dashboard");
          } else if (selectedRole === "vendor") {
            localStorage.setItem("vendor_token", data.token);
            router.push("/vendor-dashboard");
          } else if (selectedRole === "courier") {
            localStorage.setItem("courier_token", data.token);
            router.push("/courier-dashboard");
          } else if (selectedRole === "su") {
            localStorage.setItem("su_token", data.token);
            router.push("/su-dashboard");
          }
        }
      } else {
        setError(data.message || "Login failed");
      }
    } catch (error) {
      console.error('Login error:', error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
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
      {/* Top Right Navigation - Admin and SU Login */}
      <div className="absolute top-4 right-4 flex space-x-2">
        <button
          onClick={() => setSelectedRole(selectedRole === "admin" ? null : "admin")}
          className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            selectedRole === "admin"
              ? "bg-blue-600 text-white focus:ring-blue-500"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500"
          }`}
        >
          Admin Login
        </button>
        <button
          onClick={() => setSelectedRole(selectedRole === "su" ? null : "su")}
          className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            selectedRole === "su"
              ? "bg-purple-600 text-white focus:ring-purple-500"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500"
          }`}
        >
          SU Login
        </button>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">SmartKartMGM</h1>
            <p className="mt-2 text-gray-600">Sign in to your account</p>
          </div>

          {/* Role Selection Cards - Center */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedRole(selectedRole === "vendor" ? null : "vendor")}
              className={`p-4 rounded-lg border-2 transition-colors ${
                selectedRole === "vendor"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"
              }`}
            >
              <div className="font-medium">Vendor</div>
            </button>
            <button
              onClick={() => setSelectedRole(selectedRole === "courier" ? null : "courier")}
              className={`p-4 rounded-lg border-2 transition-colors ${
                selectedRole === "courier"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"
              }`}
            >
              <div className="font-medium">Courier</div>
            </button>
          </div>

          {/* Login Form */}
          <div className="bg-white p-8 rounded-lg shadow-md">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedRole === "su" ? "Name" : "Email"}
                </label>
                <input
                  id="email"
                  name="email"
                  type={selectedRole === "su" ? "text" : "email"}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder={selectedRole === "su" ? "Enter your name" : "Enter your email"}
                  value={credentials.email}
                  onChange={(e) =>
                    setCredentials({ ...credentials, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={(e) =>
                    setCredentials({ ...credentials, password: e.target.value })
                  }
                />
              </div>
              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading || !selectedRole}
                className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : selectedRole ? `Sign in as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}` : "Select a Role"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}