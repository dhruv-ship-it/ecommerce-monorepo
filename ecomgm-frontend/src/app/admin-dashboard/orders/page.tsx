"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { validateAuth, performAutoLogout, getValidToken } from "@/utils/auth";

interface Order {
  VendorProductCustomerCourierId: number;
  PurchaseId: number;
  Customer: number;
  Product: number;
  Vendor: number;
  Courier: number;
  MRP_SS: number;
  Discount_SS: number;
  GST_SS: number;
  PurchaseQty: number;
  OrderCreationTimeStamp: string;
  IsReady_for_Pickup_by_Courier: string;
  Ready_for_Pickup_by_CourierTimeStamp: string;
  TrackingNo: string;
  IsPicked_by_Courier: string;
  Picked_by_CourierTimeStamp: string;
  IsDispatched: string;
  DispatchedTimeStamp: string;
  IsOut_for_Delivery: string;
  Out_for_DeliveryTimeStamp: string;
  IsDelivered: string;
  DeliveryTimeStamp: string;
  IsReturned: string;
  ReturnTimeStamp: string;
  ProductName: string;
  VendorName: string;
  CourierName: string;
  CustomerName: string;
  CustomerEmail: string;
  CustomerMobile: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
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

  const fetchOrders = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`http://localhost:4000/admin/orders?page=${page}&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setTotalPages(data.totalPages || 1);
        setTotalOrders(data.totalOrders || 0);
      } else if (response.status === 401) {
        performAutoLogout("/");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to fetch orders");
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Validate authentication on page load
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    const validToken = getValidToken();
    if (!validToken) {
      performAutoLogout("/");
      return;
    }
    
    fetchOrders(currentPage);
  }, [currentPage, fetchOrders]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getStatus = (order: Order) => {
    if (order.IsDelivered === 'Y') return { text: 'Delivered', color: 'bg-green-100 text-green-800' };
    if (order.IsReturned === 'Y') return { text: 'Returned', color: 'bg-red-100 text-red-800' };
    if (order.IsOut_for_Delivery === 'Y') return { text: 'Out for Delivery', color: 'bg-blue-100 text-blue-800' };
    if (order.IsDispatched === 'Y') return { text: 'Dispatched', color: 'bg-indigo-100 text-indigo-800' };
    if (order.IsReady_for_Pickup_by_Courier === 'Y') return { text: 'Ready for Pickup', color: 'bg-yellow-100 text-yellow-800' };
    if (order.IsPicked_by_Courier === 'Y') return { text: 'Courier Picked Up', color: 'bg-purple-100 text-purple-800' };
    return { text: 'Order Placed', color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                EcomGM - Admin Dashboard - Orders
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
                Orders Management
              </h3>
              
              {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  <p className="mt-2">Loading orders...</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 text-sm text-gray-600">
                    Showing {((currentPage - 1) * 10) + 1}-{Math.min(currentPage * 10, totalOrders)} of {totalOrders} orders
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Order ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vendor
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Courier
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tracking No
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {orders.map((order) => {
                          const status = getStatus(order);
                          return (
                            <tr key={order.VendorProductCustomerCourierId}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                #{order.PurchaseId}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div>{order.CustomerName}</div>
                                <div className="text-xs text-gray-400">{order.CustomerEmail}</div>
                                <div className="text-xs text-gray-400">{order.CustomerMobile}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.ProductName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.VendorName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.CourierName || 'Not Assigned'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                                  {status.text}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(order.OrderCreationTimeStamp).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.TrackingNo || 'N/A'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 text-sm border rounded ${
                          currentPage === 1 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                      
                      {[...Array(totalPages)].map((_, index) => {
                        const pageNum = index + 1;
                        if (
                          pageNum === 1 || 
                          pageNum === totalPages || 
                          (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-1 text-sm border rounded ${
                                currentPage === pageNum
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                        if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                          return <span key={pageNum} className="px-3 py-1 text-sm text-gray-500">...</span>;
                        }
                        return null;
                      })}
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1 text-sm border rounded ${
                          currentPage === totalPages 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}