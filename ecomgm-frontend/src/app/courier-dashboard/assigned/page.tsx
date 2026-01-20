"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateAuth, performAutoLogout, getValidToken } from "@/utils/auth";

interface Order {
  PuchaseId: number;
  ProductId: number;
  Product: string;
  Description: string;
  ProductPrice: number;
  CustomerId: number;
  CustomerName: string;
  CustomerEmail: string;
  CustomerMobile: string;
  OrderDate: string;
  OrderStatus: string;
  TotalAmount: number;
  PaymentStatus: string;
  PaymentMode: string;
  CourierId: number;
  VendorId: number;
  VendorName: string;
  VendorMobile: string;
  ProductImage: string;
}

export default function AssignedDeliveries() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Validate authentication on page load
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    fetchOrders();
  }, [router]);

  const fetchOrders = async () => {
    try {
      setError(null);
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }
      
      const response = await fetch("http://localhost:4000/courier/orders", {
        headers: {
          Authorization: `Bearer ${validToken.token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Ensure data.orders is an array before filtering
        const ordersArray = Array.isArray(data.orders) ? data.orders : [];
        // Filter for assigned deliveries (Shipped status)
        const assignedOrders = ordersArray.filter((order: Order) => order.OrderStatus === "Shipped");
        setOrders(assignedOrders);
      } else if (response.status === 401) {
        performAutoLogout("/");
      } else {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError("Failed to load assigned deliveries. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    try {
      setUpdatingOrder(orderId);
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }
      
      const response = await fetch(`http://localhost:4000/courier/order/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken.token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        // Update order status in state
        setOrders(orders.map(order => 
          order.PuchaseId === orderId 
            ? { ...order, OrderStatus: newStatus } 
            : order
        ));
        alert(`Order status updated to ${newStatus}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update order status");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Failed to update order status. Please try again.");
    } finally {
      setUpdatingOrder(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Delivered":
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Delivered</span>;
      case "Out for Delivery":
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Out for Delivery</span>;
      case "Dispatched":
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">Dispatched</span>;
      case "Shipped":
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Shipped</span>;
      default:
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xl">Loading assigned deliveries...</span>
        </div>
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
                EcomGM - Courier Dashboard
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/courier-dashboard")}
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
                Assigned Deliveries
              </h3>
              
              {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded">
                  {error}
                </div>
              )}
              
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002-2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No assigned deliveries</h3>
                  <p className="mt-1 text-sm text-gray-500">You don't have any assigned deliveries at the moment.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Update Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order.PuchaseId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{order.PuchaseId}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0">
                                <img
                                  src={order.ProductImage || "/images/placeholder-product.jpg"}
                                  alt={order.Product}
                                  className="h-10 w-10 object-cover rounded"
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{order.Product}</div>
                                <div className="text-sm text-gray-500">₹{order.ProductPrice}</div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>{order.CustomerName}</div>
                            <div className="text-xs text-gray-400">{order.CustomerMobile}</div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>{order.VendorName}</div>
                            <div className="text-xs text-gray-400">{order.VendorMobile}</div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(order.OrderDate).toLocaleDateString()}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ₹{Number(order.TotalAmount).toFixed(2)}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(order.OrderStatus)}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              {order.OrderStatus === "Shipped" && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(order.PuchaseId, "Out for Delivery")}
                                    disabled={updatingOrder === order.PuchaseId}
                                    className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                                  >
                                    {updatingOrder === order.PuchaseId ? "Updating..." : "Out for Delivery"}
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(order.PuchaseId, "Delivered")}
                                    disabled={updatingOrder === order.PuchaseId}
                                    className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                  >
                                    {updatingOrder === order.PuchaseId ? "Updating..." : "Delivered"}
                                  </button>
                                </>
                              )}
                              {order.OrderStatus === "Out for Delivery" && (
                                <button
                                  onClick={() => handleUpdateStatus(order.PuchaseId, "Delivered")}
                                  disabled={updatingOrder === order.PuchaseId}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                >
                                  {updatingOrder === order.PuchaseId ? "Updating..." : "Delivered"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}