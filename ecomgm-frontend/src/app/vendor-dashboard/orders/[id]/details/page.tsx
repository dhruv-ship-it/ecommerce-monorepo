"use client";

import { useState, useEffect, use } from "react";

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
  CustomerAddress?: string;
  Locality?: number;
  CourierName: string;
  CourierMobile: string;
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
  // Courier acceptance status
  CourierAcceptanceStatus: string;
  // Additional fields from API response
  MRP_SS: number;
  Discount_SS: number;
  GST_SS: number;
  PurchaseQty: number;
  OrderCreationTimeStamp: string;
  // Additional fields for simplified logic
  ActualCourierId: number;
}

interface TrackingEvent {
  TrackingEventId: number;
  PurchaseId: number;
  status: string;
  location: string;
  description: string;
  timestamp: string;
}

interface Courier {
  UserId: number;
  User: string;
  UserMobile: string;
  UserEmail: string;
}

export default function OrderDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [addressHierarchy, setAddressHierarchy] = useState({
    locality: '',
    district: '',
    state: '',
    country: '',
    continent: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Validate authentication on page load
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    fetchData();
  }, [router, id]);

  const fetchData = async () => {
    try {
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }
      
      // Fetch order details
      const orderResponse = await fetch(`http://localhost:4000/vendor/order/${id}`, {
        headers: {
          Authorization: `Bearer ${validToken.token}`,
        },
      });
      
      if (orderResponse.ok) {
        const orderData = await orderResponse.json();
        setOrder(orderData.order);
        
        // Fetch address hierarchy if customer has a locality
        if (orderData.order.Locality && orderData.order.Locality !== 0) {
          try {
            const hierarchyResponse = await fetch(`http://localhost:4000/vendor/customer/address-hierarchy/${orderData.order.Locality}`, {
              headers: {
                Authorization: `Bearer ${validToken.token}`,
              },
            });
            
            if (hierarchyResponse.ok) {
              const hierarchyData = await hierarchyResponse.json();
              setAddressHierarchy(hierarchyData);
            }
          } catch (hierarchyError) {
            console.error('Error fetching address hierarchy:', hierarchyError);
          }
        }
      } else if (orderResponse.status === 401) {
        performAutoLogout("/");
        return;
      }
      
      // Fetch real tracking events from backend
      const trackingResponse = await fetch(`http://localhost:4000/vendor/order/${id}/tracking`, {
        headers: {
          Authorization: `Bearer ${validToken.token}`,
        },
      });
      
      if (trackingResponse.ok) {
        const trackingData = await trackingResponse.json();
        setTrackingEvents(trackingData.trackingEvents || []);
      }
      

    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReady = async () => {
    try {
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }
      
      const response = await fetch(`http://localhost:4000/vendor/order/${id}/ready`, {
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
          <span className="text-xl">Loading order details...</span>
        </div>
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
                SmartKartMGM - Vendor Dashboard
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
                Order Details #{id}
              </h3>
              
              {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded">
                  {error}
                </div>
              )}
              
              {/* Order Status Section */}
              <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
                <h4 className="text-md font-medium text-gray-900 mb-3">Order Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Order Status:</span> 
                      {getStatusBadge(order.OrderStatus)}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-medium">Courier Acceptance Status:</span> 
                      {getCourierAcceptanceBadge(order.CourierAcceptanceStatus)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Assigned Courier:</span> 
                      {order.CourierId ? (
                        <span className="ml-2">{order.CourierName || `Courier ${order.CourierId}`} ({order.CourierMobile})</span>
                      ) : (
                        <span className="ml-2 text-red-600">Not Assigned</span>
                      )}
                    </p>
                  </div>
                </div>
                
                {/* Mark Ready for Pickup */}
                {order.IsReady_for_Pickup_by_Courier !== 'Y' && order.CourierId > 0 && order.OrderStatus !== "Delivered" && order.OrderStatus !== "Out for Delivery" && order.OrderStatus !== "Dispatched" && (
                  <div className="mt-4 p-4 bg-white rounded border border-gray-200">
                    <h5 className="text-sm font-medium text-gray-900 mb-3">Order Ready for Pickup</h5>
                    <button
                      onClick={handleMarkReady}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      Mark Ready for Pickup
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      Note: This will notify the courier that the order is ready for pickup and generate a tracking number.
                    </p>
                  </div>
                )}
                
                {/* Ready for Pickup Status */}
                {order.IsReady_for_Pickup_by_Courier === 'Y' && (
                  <div className="mt-4 p-4 bg-green-50 rounded border border-green-200">
                    <p className="text-sm text-green-800 font-medium">
                      ✓ Order marked as ready for pickup on {new Date(order.Ready_for_Pickup_by_CourierTimeStamp).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
              
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
                      {new Date(order.OrderCreationTimeStamp || order.OrderDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Order Status:</span> 
                      {getStatusBadge(order.OrderStatus)}
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
                    {(order.CustomerAddress || addressHierarchy.locality) && (
                      <div className="pt-2 border-t border-gray-200 mt-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Address:</span>
                        </p>
                        <div className="text-sm text-gray-900 mt-1 ml-4 space-y-1">
                          {order.CustomerAddress && <p>{order.CustomerAddress}</p>}
                          {addressHierarchy.locality && <p>{addressHierarchy.locality}</p>}
                          {addressHierarchy.district && <p>{addressHierarchy.district}</p>}
                          {addressHierarchy.state && <p>{addressHierarchy.state}</p>}
                          {addressHierarchy.country && <p>{addressHierarchy.country}</p>}
                          {addressHierarchy.continent && <p>{addressHierarchy.continent}</p>}
                          {!order.CustomerAddress && !addressHierarchy.locality && <p className="text-gray-500">Address not available</p>}
                        </div>
                      </div>
                    )}
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
                          {order.Product}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {order.PurchaseQty}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          ₹{order.MRP_SS ?? order.MRP}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          ₹{order.Discount_SS ?? order.Discount}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {order.GST_SS ?? order.GST}%
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          ₹{(
                            order.PurchaseQty *
                            ((order.MRP_SS ?? order.MRP) - (order.Discount_SS ?? order.Discount)) *
                            (1 + (order.GST_SS ?? order.GST) / 100)
                          ).toFixed(2)}
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
                        ₹{(order.PurchaseQty * ((order.MRP_SS ?? order.MRP) - (order.Discount_SS ?? order.Discount))).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">GST ({order.GST_SS ?? order.GST}%):</span>
                      <span className="text-sm text-gray-900">
                        ₹{(order.PurchaseQty * ((order.MRP_SS ?? order.MRP) - (order.Discount_SS ?? order.Discount)) * ((order.GST_SS ?? order.GST) / 100)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between mt-4 pt-4 border-t border-gray-200">
                      <span className="text-base font-medium text-gray-900">Total:</span>
                      <span className="text-base font-medium text-gray-900">
                        ₹{Number(order.TotalAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Tracking Updates Section */}
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-gray-900">Tracking Updates</h4>
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
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Print Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}