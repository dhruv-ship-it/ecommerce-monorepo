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

interface TrackingEvent {
  TrackingEventId: number;
  PurchaseId: number;
  status: string;
  location: string;
  description: string;
  timestamp: string;
}

export default function TrackingDetail({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Validate authentication on page load
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    const fetchOrderAndTracking = async () => {
      try {
        const validToken = getValidToken();
        if (!validToken) {
          performAutoLogout("/");
          return;
        }
        
        // Fetch order details
        const orderResponse = await fetch(`http://localhost:4000/courier/order/${params.id}`, {
          headers: {
            Authorization: `Bearer ${validToken.token}`,
          },
        });
        
        if (orderResponse.ok) {
          const orderData = await orderResponse.json();
          setOrder(orderData.order);
          
          // Fetch real tracking events from backend instead of generating mock data
          const trackingResponse = await fetch(`http://localhost:4000/courier/order/${params.id}/tracking`, {
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
    
    fetchOrderAndTracking();
  }, [router, params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading tracking details...</div>
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

  const handleAddTrackingEvent = async () => {
    if (!location || !description) {
      alert('Please enter location and description');
      return;
    }
    
    try {
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }
      
      // Determine status based on current order status
      let status = 'Unknown';
      if (order?.IsOut_for_Delivery === 'N' && order?.IsDelivered === 'N') {
        status = 'Out for Delivery';
      } else if (order?.IsOut_for_Delivery === 'Y' && order?.IsDelivered === 'N') {
        status = 'Delivered';
      }
      
      const response = await fetch(`http://localhost:4000/courier/order/${params.id}/tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken.token}`,
        },
        body: JSON.stringify({
          status,
          location,
          description,
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        // Refresh tracking events
        const data = await response.json();
        
        // Fetch updated tracking events
        const updatedEventsResponse = await fetch(`http://localhost:4000/courier/order/${params.id}/tracking`, {
          headers: {
            Authorization: `Bearer ${validToken.token}`,
          },
        });
        
        if (updatedEventsResponse.ok) {
          const updatedEventsData = await updatedEventsResponse.json();
          setTrackingEvents(updatedEventsData.trackingEvents || []);
          
          // Update order state with new data
          if (updatedEventsData.order) {
            setOrder(updatedEventsData.order);
          }
        }
        
        // Clear form
        setLocation('');
        setDescription('');
      }
    } catch (error) {
      console.error('Error adding tracking event:', error);
      alert('Error adding tracking event');
    }
  };

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
                onClick={() => router.push("/courier-dashboard/tracking")}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Back to Tracking
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
                Tracking Details for Order #{params.id}
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
                                : 'bg-yellow-100 text-yellow-800'}`}
                      >
                        {order.IsDelivered === 'Y' 
                          ? 'Delivered' 
                          : order.IsOut_for_Delivery === 'Y' 
                            ? 'Out for Delivery'
                            : order.IsDispatched === 'Y'
                              ? 'Shipped'
                              : 'Processing'}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Tracking Number:</span> {order.TrackingNo || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Total Amount:</span> ₹{Number(order.TotalAmount).toFixed(2)}
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
                      <span className="font-medium">Customer Email:</span> {order.CustomerEmail}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Customer Mobile:</span> {order.CustomerMobile}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Tracking Updates Section */}
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-gray-900">Tracking Updates</h4>
                  {order?.OrderStatus !== 'Delivered' && (
                    <button
                      onClick={handleAddTrackingEvent}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Add Tracking Update
                    </button>
                  )}
                </div>
                
                {/* Tracking Form */}
                {order?.OrderStatus !== 'Delivered' && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                          Location
                        </label>
                        <input
                          id="location"
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Current location"
                        />
                      </div>
                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          id="description"
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Describe the update"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add CSS for timeline
const timelineStyles = `
  .timeline {
    position: relative;
  }
  .timeline::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #3B82F6;
    left: 1rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
  }
  .timeline-item {
    position: relative;
    margin-bottom: 1.5rem;
  }
  .timeline-item::before {
    content: '';
    position: absolute;
    top: 0.5rem;
    left: 1rem;
    width: 12px;
    height: 12px;
    background: #3B82F6;
    border-radius: 999px;
    border: 2px solid white;
    z-index: 1;
  }
`;
