"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { validateAuth, performAutoLogout, getValidToken } from "@/utils/auth";
import Link from "next/link";

interface Customer {
  CustomerId: number;
  Customer: string;
  CustomerEmail: string;
  CustomerMobile: string;
  Gender: string;
  CustomerPIN: string;
  DoB: string;
  Address: string;
  IsVerified: string;
  IsActivated: string;
  IsBlackListed: string;
  IsDead: string;
  IsDeleted: string;
}

export default function ViewCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [error, setError] = useState("");
  const router = useRouter();

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

  const fetchCustomers = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    
    try {
      const response = await fetch(
        `http://localhost:4000/admin/customers?page=${page}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setCustomers(Array.isArray(data.customers) ? data.customers : []);
        setTotal(data.total || 0);
      } else if (response.status === 401) {
        performAutoLogout("/");
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
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
                onClick={() => router.push("/admin-dashboard")}
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
                <span className="text-blue-600 font-bold">View Customers</span>
              </h3>
              
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mobile
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.isArray(customers) && customers.map((customer) => (
                      <tr key={customer.CustomerId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {customer.Customer}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.CustomerEmail}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.CustomerMobile}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              customer.IsDead === "Y"
                                ? "bg-gray-800 text-white"
                                : customer.IsBlackListed === "Y"
                                ? "bg-red-100 text-red-800"
                                : customer.IsActivated === "Y"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {customer.IsDead === "Y"
                              ? "Dead"
                              : customer.IsBlackListed === "Y"
                              ? "Blacklisted"
                              : customer.IsActivated === "Y"
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Link href={`/admin-dashboard/view-customers/${customer.CustomerId}`} className="text-blue-600 hover:text-blue-900">
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  Showing {((page - 1) * 10) + 1} to{" "}
                  {Math.min(page * 10, total)} of {total} customers
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page * 10 >= total}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                  >
                    Next
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
