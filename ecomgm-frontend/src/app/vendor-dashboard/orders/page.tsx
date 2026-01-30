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
  CourierName: string;
  CourierMobile: string;
  VendorId: number;
  CourierAcceptanceStatus: string;
  IsReadyForPickup: string;
  ActualCourierId: number;
  IsPicked_by_Courier: string;
}

interface Courier {
  UserId: number;
  User: string;
  UserMobile: string;
  UserEmail: string;
}

export default function VendorOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningCourier, setAssigningCourier] = useState<number | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Validate authentication on page load
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }
      
      // Fetch orders
      const ordersResponse = await fetch("http://localhost:4000/vendor/orders", {
        headers: {
          Authorization: `Bearer ${validToken.token}`,
        },
      });
      
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setOrders(Array.isArray(ordersData.orders) ? ordersData.orders : []);
      } else if (ordersResponse.status === 401) {
        performAutoLogout("/");
        return;
      }
      
      // Fetch couriers
      const couriersResponse = await fetch("http://localhost:4000/vendor/couriers", {
        headers: {
          Authorization: `Bearer ${validToken.token}`,
        },
      });
      
      if (couriersResponse.ok) {
        const couriersData = await couriersResponse.json();
        setCouriers(Array.isArray(couriersData.couriers) ? couriersData.couriers : []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCourier = async (orderId: number) => {
    if (selectedCourier === 0) {
      alert("Please select a courier");
      return;
    }
    
    try {
      setAssigningCourier(orderId);
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }
      
      const response = await fetch(`http://localhost:4000/vendor/order/${orderId}/assign-courier`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken.token}`,
        },
        body: JSON.stringify({ courierId: selectedCourier }),
      });
      
      if (response.ok) {
        alert("Courier assigned successfully!");
        fetchData(); // Refresh data
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to assign courier");
      }
    } catch (error) {
      console.error("Error assigning courier:", error);
      alert("Failed to assign courier");
    } finally {
      setAssigningCourier(null);
      setSelectedCourier(0);
    }
  };

  const handleMarkReady = async (orderId: number) => {
    try {
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }
      
      const response = await fetch(`http://localhost:4000/vendor/order/${orderId}/ready`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken.token}`,
        },
      });
      
      if (response.ok) {
        alert("Order marked as ready for pickup!");
        fetchData(); // Refresh data
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to mark order as ready");
      }
    } catch (error) {
      console.error("Error marking order as ready:", error);
      alert("Failed to mark order as ready");
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
      case "Picked Up":
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Picked Up</span>;
      case "Courier Assigned":
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Courier Assigned</span>;
      case "Ready for Pickup":
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Ready for Pickup</span>;
      case "No Courier Assigned":
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">No Courier Assigned</span>;
      default:
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getCourierAcceptanceBadge = (status: string) => {
    switch (status) {
      case "Courier Assigned":
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Courier Assigned</span>;
      case "Ready for Pickup":
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Ready for Pickup</span>;
      case "Rejected":
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Rejected</span>;
      case "No Courier Assigned":
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">No Courier</span>;
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
          <span className="text-xl">Loading orders...</span>
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
                EcomGM - Vendor Dashboard
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push('/vendor-dashboard')}
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
                Orders Management
              </h3>
              
              {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded">
                  {error}
                </div>
              )}
              
              {Array.isArray(orders) && orders.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002-2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
                  <p className="mt-1 text-sm text-gray-500">You don't have any orders yet.</p>
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
                          Order Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Courier Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Courier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.isArray(orders) && orders.map((order) => (
                        <tr key={order.PuchaseId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{order.PuchaseId}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.Product}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>{order.CustomerName}</div>
                            <div className="text-xs text-gray-400">{order.CustomerMobile}</div>
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
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getCourierAcceptanceBadge(order.CourierAcceptanceStatus)}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.CourierId ? (
                              <div>
                                <div>{order.CourierName || `Courier ${order.CourierId}`}</div>
                                <div className="text-xs text-gray-400">{order.CourierMobile}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">Not Assigned</span>
                            )}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex flex-col space-y-2">
                              {order.CourierId === 0 && (
                                <div className="text-xs text-gray-500 italic">
                                  Auto-assigning default courier...
                                </div>
                              )}
                              
                              {order.IsReadyForPickup !== 'Y' && order.CourierId > 0 && order.OrderStatus !== "Delivered" && order.OrderStatus !== "Out for Delivery" && order.OrderStatus !== "Dispatched" && (
                                <button
                                  onClick={() => handleMarkReady(order.PuchaseId)}
                                  className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                >
                                  Mark Ready for Pickup
                                </button>
                              )}
                              
                              <button
                                onClick={() => router.push(`/vendor-dashboard/orders/${order.PuchaseId}/details`)}
                                className="text-xs text-blue-600 hover:text-blue-900"
                              >
                                View Details
                              </button>
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