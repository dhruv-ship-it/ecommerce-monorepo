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
  // Additional fields
  Quantity: number;
  MRP: number;
  Discount: number;
  GST: number;
  ProductName: string;
}

interface TrackingEvent {
  TrackingEventId: number;
  PurchaseId: number;
  status: string;
  location: string;
  description: string;
  timestamp: string;
}

export default function OrderDetails({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Validate authentication on page load
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    const fetchOrderDetails = async () => {
      try {
        const validToken = getValidToken();
        if (!validToken) {
          performAutoLogout("/");
          return;
        }
        
        // Fetch order details
        const orderResponse = await fetch(`http://localhost:4000/vendor/order/${params.id}`, {
          headers: {
            Authorization: `Bearer ${validToken.token}`,
          },
        });
        
        if (orderResponse.ok) {
          const orderData = await orderResponse.json();
          setOrder(orderData.order);
          
          // Fetch real tracking events from backend instead of generating mock data
          const trackingResponse = await fetch(`http://localhost:4000/vendor/order/${params.id}/tracking`, {
            headers: {
              Authorization: `Bearer ${validToken.token}`,
            },
          });
          
          if (trackingResponse.ok) {
            const trackingData = await trackingResponse.json();
            setTrackingEvents(trackingData.trackingEvents || []);
          } else {
            console.error("Failed to fetch tracking events");
            setTrackingEvents([]);
          }
        } else if (orderResponse.status === 401) {
          performAutoLogout("/");
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderDetails();
  }, [router, params.id]);

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
                onClick={() => router.push("/vendor-dashboard/orders")}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Back to Orders
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
                Order Details #{params.id}
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
              
              {/* Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Order Information</h4>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Order Date:</span> 
                      {new Date(order.OrderDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Order Status:</span> 
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full 
                          ${order.IsDelivered === 'Y' 
                            ? 'bg-green-100 text-green-800' 
                            : order.IsOut_for_Delivery === 'Y' 
                              ? 'bg-blue-100 text-blue-800'
                              : order.IsDispatched === 'Y'
                                ? 'bg-purple-100 text-purple-800'
                                : order.IsPicked_by_Courier === 'Y'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'}`}
                      >
                        {order.IsDelivered === 'Y' 
                          ? 'Delivered' 
                          : order.IsOut_for_Delivery === 'Y' 
                            ? 'Out for Delivery'
                            : order.IsDispatched === 'Y'
                              ? 'Shipped'
                              : order.IsPicked_by_Courier === 'Y'
                                ? 'Courier Accepted'
                                : 'Processing'}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Payment Status:</span> 
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full 
                          ${order.PaymentStatus === 'Completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'}`}
                      >
                        {order.PaymentStatus}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Tracking Number:</span> {order.TrackingNo || 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Customer Information</h4>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Customer Name:</span> {order.CustomerName}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Email:</span> {order.CustomerEmail}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Phone:</span> {order.CustomerMobile}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Product Details */}
              <div className="bg-gray-50 p-4 rounded-lg mb-8">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Product Details</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Discount
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          GST
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {order.ProductName}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {order.Quantity}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          ₹{order.MRP}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          ₹{order.Discount}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {order.GST}%
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          ₹{(order.Quantity * (order.MRP - order.Discount) * (1 + order.GST/100)).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Order Totals */}
              <div className="bg-gray-50 p-4 rounded-lg mb-8">
                <div className="flex justify-end">
                  <div className="w-full max-w-md">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Subtotal:</span>
                      <span className="text-sm text-gray-900">
                        ₹{(order.Quantity * (order.MRP - order.Discount)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">GST ({order.GST}%):</span>
                      <span className="text-sm text-gray-900">
                        ₹{(order.Quantity * (order.MRP - order.Discount) * (order.GST/100)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between mt-4 pt-4 border-t border-gray-200">
                      <span className="text-base font-medium text-gray-900">Total:</span>
                      <span className="text-base font-medium text-gray-900">
                        ₹{(order.Quantity * (order.MRP - order.Discount) * (1 + order.GST/100)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Tracking Updates Section */}
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-gray-900">Tracking Updates</h4>
                  {order?.OrderStatus !== 'Delivered' && (
                    <button
                      onClick={() => router.push(`/vendor-dashboard/orders/${params.id}/update`)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Update Tracking
                    </button>
                  )}
                </div>
                
                {/* Tracking Timeline */}
                <div className="space-y-6">
                  {trackingEvents.length > 0 ? (
                    trackingEvents.map((event) => (
                      <div key={event.TrackingEventId} className="relative">
                        <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
                          <div className="flex items-start">
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                {event.status}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(event.timestamp).toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-500">
                                {event.location}
                              </p>
                              <p className="text-sm text-gray-700 mt-1">
                                {event.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No tracking information available for this order.</p>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Print Order
                </button>
                <button
                  onClick={() => router.push(`/vendor-dashboard/orders/${order?.PuchaseId}/update`)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Update Order Status
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


