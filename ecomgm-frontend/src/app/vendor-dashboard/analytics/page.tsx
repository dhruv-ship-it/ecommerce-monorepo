"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateAuth, performAutoLogout, getValidToken } from "@/utils/auth";

export default function VendorAnalytics() {
  const router = useRouter();

  // Validate authentication on page load
  useEffect(() => {
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                SmartKartMGM - Vendor Dashboard
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/vendor-dashboard")}
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
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Analytics
              </h3>
              <p className="text-sm text-gray-500">
                This is where you would see your sales and performance data.
              </p>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg h-64 flex items-center justify-center">
                  <p className="text-sm text-gray-500">Sales Chart Placeholder</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg h-64 flex items-center justify-center">
                  <p className="text-sm text-gray-500">Performance Metrics Placeholder</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}