"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePageRedirector() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Check for existing session and redirect accordingly
  useEffect(() => {
    setMounted(true);
    
    // Check for existing tokens and redirect to appropriate dashboard
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
      
      // If no tokens found, redirect to login page
      router.push("/login");
    }
  }, [router]);

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
      <div className="flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="text-4xl font-extrabold text-gray-900 mb-2">SmartKartMGM</div>
          <div className="text-xl text-gray-600 mt-4">Redirecting...</div>
        </div>
      </div>
    </div>
  );
}