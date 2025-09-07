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
  OrderDate: string;
  OrderStatus: string;
  TotalAmount: number;
  PaymentStatus: string;
  PaymentMode: string;
  CourierId: number;
  VendorId: number;
  ProductImage: string;
}

export default function CourierOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Validate authentication on page load
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    const fetchOrders = async () => {
      try {
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
          // Ensure data.orders is an array before using it
          setOrders(Array.isArray(data.orders) ? data.orders : []);
        } else if (response.status === 401) {
          performAutoLogout("/");
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, [router]);

  // Add this useEffect to setup timeout handlers for new orders
  useEffect(() => {
    if (orders.length === 0) return;

    // For each pending order, setup a timeout handler
    const timeoutHandlers = orders
      .filter(order => order.OrderStatus === "Pending")
      .map(order => {
        const timeoutId = setTimeout(async () => {
          try {
            const validToken = getValidToken();
            if (!validToken) {
              performAutoLogout("/");
              return;
            }
            
            // Call backend to handle timeout and find next courier
            const response = await fetch(`http://localhost:4000/courier/order/${order.PuchaseId}/timeout`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${validToken.token}`,
              },
            });

            if (response.ok) {
              // Remove timed-out order from view
              setOrders(orders.filter(o => o.PuchaseId !== order.PuchaseId));
            }
          } catch (error) {
            console.error("Error handling order timeout:", error);
          }
        }, 30 * 60 * 1000); // 30-minute timeout
        
        return {
          orderId: order.PuchaseId,
          timeoutId
        };
      });

    // Cleanup function to clear timeouts
    return () => {
      timeoutHandlers.forEach(handler => {
        if (handler.timeoutId) {
          clearTimeout(handler.timeoutId);
        }
      });
    };
  }, [orders]);

  const handleAcceptOrder = async (orderId: number) => {
    try {
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
        body: JSON.stringify({ status: "Shipped" }),
      });
      
      if (response.ok) {
        // Update order status in state
        setOrders(orders.map(order => 
          order.PuchaseId === orderId 
            ? { ...order, OrderStatus: "Shipped" } 
            : order
        ));
      }
    } catch (error) {
      console.error("Error accepting order:", error);
    }
  };

  const handleRejectOrder = async (orderId: number) => {
    if (!window.confirm("Are you sure you want to reject this order?")) {
      return;
    }
    
    try {
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
        body: JSON.stringify({ status: "Pending" }),
      });
      
      if (response.ok) {
        // Remove rejected order from view
        setOrders(orders.filter(order => order.PuchaseId !== orderId));
      }
    } catch (error) {
      console.error("Error rejecting order:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading orders...</div>
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
                Orders for Acceptance
              </h3>
              
              {Array.isArray(orders) && orders.length === 0 ? (
                <p className="text-sm text-gray-500">No orders available for acceptance.</p>
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
                          Price
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
                          Payment Status
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
                          
                          {/* Add product image and details */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-12 w-12 flex-shrink-0">
                                <img
                                  src={order.ProductImage || "/images/placeholder-product.jpg"}
                                  alt={order.Product}
                                  className="h-12 w-12 object-cover rounded"
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{order.Product}</div>
                                <div className="text-sm text-gray-500">{order.Description}</div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ₹{order.ProductPrice}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            Customer {order.CustomerId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(order.OrderDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ₹{Number(order.TotalAmount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full 
                                ${order.PaymentStatus === 'Completed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'}`}
                            >
                              {order.PaymentStatus}
                            </span>
                          </td>
                          
                          {/* Add time remaining indicator for pending orders */}
                          {order.OrderStatus === "Pending" && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                              {getTimeRemaining(order.OrderDate)}
                              </div>
                            </td>
                          )}
                          
                          {/* Update the Actions column to show more details in buttons */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              {order.OrderStatus === "Pending" && (
                                <>
                                  <button
                                    onClick={() => handleAcceptOrder(order.PuchaseId)}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleRejectOrder(order.PuchaseId)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => router.push(`/courier/order/${order.PuchaseId}`)}
                                className="text-blue-600 hover:text-blue-900"
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

// Add helper function for time remaining calculation
function getTimeRemaining(timestamp: string): string {
  if (!timestamp) return "";
  
  const now = new Date();
  const orderTime = new Date(timestamp);
  const diffMs = 30 * 60 * 1000 - (now.getTime() - orderTime.getTime());
  
  if (diffMs <= 0) return "Time expired";
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffSecs = Math.floor((diffMs % 60000) / 1000);
  return `${diffMins}m ${diffSecs}s remaining`;
}