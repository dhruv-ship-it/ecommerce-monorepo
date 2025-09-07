"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateAuth, performAutoLogout } from "@/utils/auth";

export default function AdminLogin() {
  const [loginType, setLoginType] = useState<"su" | "user">("user");
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      
      const endpoint = loginType === "su" ? "/api/auth/su-login" : "/api/auth/user-login";
      
      const response = await fetch(`http://localhost:4000${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: credentials.username,
          password: credentials.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token based on login type
        if (loginType === "su") {
          if (typeof window !== 'undefined') {
            localStorage.setItem("su_token", data.token);
          }
          router.push("/su-dashboard");
        } else {
          // Role-specific token storage
          if (typeof window !== 'undefined') {
            if (data.user.role === "admin") {
              localStorage.setItem("admin_token", data.token);
              router.push("/admin-dashboard");
            } else if (data.user.role === "vendor") {
              localStorage.setItem("vendor_token", data.token);
              router.push("/vendor-dashboard");
            } else if (data.user.role === "courier") {
              localStorage.setItem("courier_token", data.token);
              router.push("/courier-dashboard");
            } else {
              // Fallback: treat as generic user
              localStorage.setItem("admin_token", data.token);
              router.push("/admin-dashboard");
            }
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            EcomGM Admin Portal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>
        
        <div className="flex rounded-md shadow-sm mb-6">
          <button
            type="button"
            onClick={() => setLoginType("user")}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-md border ${
              loginType === "user"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            User Login
          </button>
          <button
            type="button"
            onClick={() => setLoginType("su")}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-r-md border ${
              loginType === "su"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            SU Login
          </button>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                {loginType === "su" ? "SU Username" : "Username/Email"}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={loginType === "su" ? "SU Username" : "Username or Email"}
                value={credentials.username}
                onChange={(e) =>
                  setCredentials({ ...credentials, username: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
