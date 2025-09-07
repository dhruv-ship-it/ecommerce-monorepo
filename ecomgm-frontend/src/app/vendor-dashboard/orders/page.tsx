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
  CustomerName: string;
  CustomerEmail: string;
  CustomerMobile: string;
}

export default function VendorOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<number | null>(null);
  const [assigningCourierTo, setAssigningCourierTo] = useState<number | null>(null);
  const router = useRouter();

  // Fetch orders and couriers on component mount
  useEffect(() => {
    // Validate authentication on page load
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    const fetchData = async () => {
      try {
        const validToken = getValidToken();
        if (!validToken) {
          performAutoLogout("/");
          return;
        }
        
        // Fetch orders and couriers in parallel
        const [ordersResponse, couriersResponse] = await Promise.all([
          fetch("http://localhost:4000/vendor/orders", {
            headers: {
              Authorization: `Bearer ${validToken.token}`,
            },
          }),
          fetch("http://localhost:4000/vendor/couriers", {
            headers: {
              Authorization: `Bearer ${validToken.token}`,
            },
          })
        ]);
        
        if (ordersResponse.ok && couriersResponse.ok) {
          const ordersData = await ordersResponse.json();
          const couriersData = await couriersResponse.json();
          // Ensure data is an array before using it
          setOrders(Array.isArray(ordersData.orders) ? ordersData.orders : []);
          setCouriers(Array.isArray(couriersData.couriers) ? couriersData.couriers : []);
        } else if (ordersResponse.status === 401 || couriersResponse.status === 401) {
          performAutoLogout("/");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);

  // Fetch couriers when component mounts
  const handleAssignCourier = async (orderId: number) => {
    if (!selectedCourierId) {
      alert("Please select a courier first");
      return;
    }
    
    try {
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
        body: JSON.stringify({ courierId: selectedCourierId })
      });
      
      if (response.ok) {
        // Update order status to "Assigned"
        const updatedOrders = orders.map(order => 
          order.PuchaseId === orderId 
            ? { ...order, OrderStatus: "Assigned" } 
            : order
        );
        setOrders(updatedOrders);
        setAssigningCourierTo(null);
      }
    } catch (error) {
      console.error("Error assigning courier:", error);
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
                EcomGM - Vendor Dashboard
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
                Orders for Fulfillment
              </h3>
              
              {Array.isArray(orders) && orders.length === 0 ? (
                <p className="text-sm text-gray-500">No orders available at the moment.</p>
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
                          Payment Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Status
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
                          
                          {/* Add customer details */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="text-sm font-medium text-gray-900">{order.CustomerName}</div>
                            <div className="text-sm text-gray-500">{order.CustomerEmail}</div>
                            <div className="text-sm text-gray-500">{order.CustomerMobile}</div>
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full 
                                ${order.OrderStatus === 'Delivered' 
                                  ? 'bg-green-100 text-green-800' 
                                  : order.OrderStatus === 'Shipped' 
                                    ? 'bg-blue-100 text-blue-800'
                                    : order.OrderStatus === 'Pending' 
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'}`}
                            >
                              {order.OrderStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.OrderStatus === "Pending" && (
                              <>
                                <button
                                  onClick={() => handleAssignCourier(order.PuchaseId)}
                                  className="text-blue-600 hover:text-blue-900 mb-2"
                                >
                                  Assign Courier
                                </button>
                                <button
                                  onClick={() => {
                                    setAssigningCourierTo(order.PuchaseId);
                                    // Reset selected courier when opening modal
                                    setSelectedCourierId(null);
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Manual Assign
                                </button>
                              </>
                            )}
                            {order.OrderStatus === "Assigned" && (
                              <button
                                onClick={() => router.push(`/vendor-dashboard/orders/${order.PuchaseId}/update`)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Update Status
                              </button>
                            )}
                            <button
                              onClick={() => router.push(`/vendor-dashboard/orders/${order.PuchaseId}/details`)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              View Details
                            </button>
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

      {/* Render the modal */}
      <CourierAssignmentModal
        isOpen={assigningCourierTo !== null}
        onClose={() => setAssigningCourierTo(null)}
        couriers={couriers}
        selectedCourierId={selectedCourierId}
        onCourierSelect={setSelectedCourierId}
        onAssign={handleAssignCourier}
        orderId={assigningCourierTo || 0}
      />
    </div>
  );
}

// Add modal component for manual courier assignment
function CourierAssignmentModal({ 
  isOpen, 
  onClose, 
  couriers, 
  selectedCourierId, 
  onCourierSelect, 
  onAssign, 
  orderId
}: {
  isOpen: boolean;
  onClose: () => void;
  couriers: any[];
  selectedCourierId: number | null;
  onCourierSelect: (id: number) => void;
  onAssign: (orderId: number) => void;
  orderId: number;
}) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        
        <div className="inline-block bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all my-8 align-middle max-w-lg w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Assign Courier for Order #{orderId}
                </h3>
                <div className="mt-4">
                  <label htmlFor="courier-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Courier
                  </label>
                  <select
                    id="courier-select"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    value={selectedCourierId || ""}
                    onChange={(e) => onCourierSelect(parseInt(e.target.value))}
                  >
                    <option value="">Select a courier</option>
                    {Array.isArray(couriers) && couriers.map((courier) => (
                      <option key={courier.UserId} value={courier.UserId}>
                        {courier.User} ({courier.UserEmail})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={() => onAssign(orderId)}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Assign Courier
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}