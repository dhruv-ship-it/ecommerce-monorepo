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
  // Tracking fields from VendorProductCustomerCourier
  TrackingNo: string;
  IsReady_for_Pickup_by_Courier: string;
  Ready_for_Pickup_by_CourierTimeStamp: string;
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
}

export default function UpdateOrderStatus({ params }: { params: { id: string } }) {
  const [orderStatus, setOrderStatus] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Validate authentication on page load
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    const fetchOrder = async () => {
      try {
        const validToken = getValidToken();
        if (!validToken) {
          performAutoLogout("/");
          return;
        }
        
        const response = await fetch(`http://localhost:4000/vendor/order/${params.id}`, {
          headers: {
            Authorization: `Bearer ${validToken.token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setOrder(data.order);
          setOrderStatus(data.order.OrderStatus);
        } else if (response.status === 401) {
          performAutoLogout("/");
        }
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrder();
  }, [router, params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }
      
      const response = await fetch(`http://localhost:4000/vendor/order/${params.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken.token}`,
        },
        body: JSON.stringify({
          status: orderStatus,
          trackingNumber
        })
      });
      
      if (response.ok) {
        // Show success message and redirect
        alert("Order status updated successfully!");
        router.push(`/vendor-dashboard/orders/${params.id}/details`);
      } else if (response.status === 401) {
        performAutoLogout("/");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Error updating order status");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading order details...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Order not found</div>
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
                onClick={() => router.push(`/vendor-dashboard/orders/${params.id}/details`)}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Back to Order Details
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                Update Order Status #{params.id}
              </h3>
              
              {/* Product Details Section */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Product Details</h4>
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3 mb-4 md:mb-0 md:mr-6">
                    <img
                      src={order?.ProductImage || "/images/placeholder-product.jpg"}
                      alt={order?.Product || "Product"}
                      className="w-full h-48 object-cover rounded-md"
                    />
                  </div>
                  <div className="md:w-2/3">
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-500">Product Name</h5>
                      <p className="text-lg font-medium text-gray-900">{order?.Product}</p>
                    </div>
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-500">Description</h5>
                      <p className="text-gray-700">{order?.Description}</p>
                    </div>
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-500">Price</h5>
                      <p className="text-gray-900">₹{order?.ProductPrice}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Order Status Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Status
                  </label>
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  >
                    <option value="Pending">Pending</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter tracking number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Status: 
                    {order.IsDelivered === 'Y' 
                      ? 'Delivered' 
                      : order.IsOut_for_Delivery === 'Y' 
                        ? 'Out for Delivery'
                        : order.IsDispatched === 'Y'
                          ? 'Shipped'
                          : order.IsPicked_by_Courier === 'Y'
                            ? 'Courier Accepted'
                            : 'Processing'}
                  </label>
                </div>
                
                <div className="flex space-x-3 pt-6">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Update Status
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/vendor-dashboard/orders/${params.id}/details`)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}