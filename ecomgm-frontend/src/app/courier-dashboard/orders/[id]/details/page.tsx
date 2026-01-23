"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateAuth, performAutoLogout, getValidToken } from "@/utils/auth";

interface OrderDetails {
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
  Customer: string;
  CustomerMobile: string;
  CustomerEmail: string;
  CustomerAddress?: string;
  Locality?: number;
  VendorName: string;
  VendorMobile: string;
  VendorEmail: string;
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

export default function CourierOrderDetails({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [addressHierarchy, setAddressHierarchy] = useState({
    locality: '',
    district: '',
    state: '',
    country: '',
    continent: ''
  });
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Validate authentication on page load
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setError(null);
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }
      
      const response = await fetch(`http://localhost:4000/courier/order/${id}`, {
        headers: {
          Authorization: `Bearer ${validToken.token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
        
        // Fetch address hierarchy if customer has a locality
        if (data.order.Locality && data.order.Locality !== 0) {
          try {
            const hierarchyResponse = await fetch(`http://localhost:4000/courier/customer/address-hierarchy/${data.order.Locality}`, {
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
      } else if (response.status === 401) {
        performAutoLogout("/");
      } else if (response.status === 404) {
        setError("Order not found");
      } else {
        throw new Error(`Failed to fetch order: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      setError("Failed to load order details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (status: string) => {
    try {
      setUpdatingStatus(status);
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }
      
      const response = await fetch(`http://localhost:4000/courier/order/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken.token}`,
        },
        body: JSON.stringify({ status }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
        alert(`Order status updated to ${status}`);
      } else {
        const errorData = await response.json();
        alert(errorData.error || `Failed to update order status to ${status}`);
      }
    } catch (error) {
      console.error(`Error updating order status to ${status}:`, error);
      alert(`Failed to update order status to ${status}. Please try again.`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusInfo = () => {
    if (!order) return null;
    
    const statusSteps = [
      { key: 'IsReady_for_Pickup_by_Courier', label: 'Ready for Pickup', time: order.Ready_for_Pickup_by_CourierTimeStamp },
      { key: 'IsPicked_by_Courier', label: 'Picked Up', time: order.Picked_by_CourierTimeStamp },
      { key: 'IsDispatched', label: 'Dispatched', time: order.DispatchedTimeStamp },
      { key: 'IsOut_for_Delivery', label: 'Out for Delivery', time: order.Out_for_DeliveryTimeStamp },
      { key: 'IsDelivered', label: 'Delivered', time: order.DeliveryTimeStamp },
    ];
    
    return statusSteps;
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/courier-dashboard/orders")}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Order not found</p>
          <button
            onClick={() => router.push("/courier-dashboard/orders")}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo();
  const isReadyForPickup = order.IsReady_for_Pickup_by_Courier === 'Y';

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
            <div className="flex items-center space-x-2">
              <button
                onClick={() => router.push("/courier-dashboard/orders")}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Back to Orders
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Order Details #{order.PuchaseId}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Order placed on {new Date(order.OrderDate).toLocaleDateString()}
                  </p>
                </div>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  order.OrderStatus === 'Delivered' ? 'bg-green-100 text-green-800' :
                  order.OrderStatus === 'Out for Delivery' ? 'bg-blue-100 text-blue-800' :
                  order.OrderStatus === 'Dispatched' ? 'bg-indigo-100 text-indigo-800' :
                  order.IsReady_for_Pickup_by_Courier === 'Y' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {order.OrderStatus}
                </span>
              </div>

              {order.TrackingNo && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Tracking Number:</span> {order.TrackingNo}
                  </p>
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Information */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Product Information</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">Product Name</p>
                      <p className="text-sm font-medium">{order.Product}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Product Price</p>
                      <p className="text-sm font-medium">₹{order.ProductPrice}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="text-sm font-medium">₹{Number(order.TotalAmount).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Vendor Information */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Vendor Information</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">Vendor Name</p>
                      <p className="text-sm font-medium">{order.VendorName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Vendor Mobile</p>
                      <p className="text-sm font-medium">{order.VendorMobile}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Vendor Email</p>
                      <p className="text-sm font-medium">{order.VendorEmail || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Customer Information</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">Customer Name</p>
                      <p className="text-sm font-medium">{order.Customer}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Customer Mobile</p>
                      <p className="text-sm font-medium">{order.CustomerMobile}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Customer Email</p>
                      <p className="text-sm font-medium">{order.CustomerEmail}</p>
                    </div>
                    {(order.CustomerAddress || addressHierarchy.locality) && (
                      <div className="pt-2 border-t border-gray-200 mt-2">
                        <p className="text-sm text-gray-500">
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

                {/* Status Information */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Order Status</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-500">Current Status</p>
                      <p className="text-sm font-medium">{order.OrderStatus}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-500">Ready for Pickup</p>
                      <p className="text-sm font-medium">
                        {order.IsReady_for_Pickup_by_Courier === 'Y' ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-500">Picked Up</p>
                      <p className="text-sm font-medium">
                        {order.IsPicked_by_Courier === 'Y' ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-500">Dispatched</p>
                      <p className="text-sm font-medium">
                        {order.IsDispatched === 'Y' ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-500">Out for Delivery</p>
                      <p className="text-sm font-medium">
                        {order.IsOut_for_Delivery === 'Y' ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-500">Delivered</p>
                      <p className="text-sm font-medium">
                        {order.IsDelivered === 'Y' ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Update Buttons */}
              <div className="mt-8">
                <h4 className="text-md font-medium text-gray-900 mb-3">Quick Status Updates</h4>
                
                {!isReadyForPickup ? (
                  <div className="p-4 bg-yellow-50 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <span className="font-medium">Notice:</span> Vendor has not yet marked this order as "Ready for Pickup". 
                      You will be able to update the status once the vendor marks it ready.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {order.IsPicked_by_Courier !== 'Y' && (
                      <button
                        onClick={() => updateOrderStatus('Picked Up')}
                        disabled={updatingStatus === 'Picked Up'}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {updatingStatus === 'Picked Up' ? 'Updating...' : 'Mark as Picked Up'}
                      </button>
                    )}
                    
                    {order.IsPicked_by_Courier === 'Y' && order.IsDispatched !== 'Y' && (
                      <button
                        onClick={() => updateOrderStatus('Dispatched')}
                        disabled={updatingStatus === 'Dispatched'}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {updatingStatus === 'Dispatched' ? 'Updating...' : 'Mark as Dispatched'}
                      </button>
                    )}
                    
                    {order.IsDispatched === 'Y' && order.IsOut_for_Delivery !== 'Y' && (
                      <button
                        onClick={() => updateOrderStatus('Out for Delivery')}
                        disabled={updatingStatus === 'Out for Delivery'}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {updatingStatus === 'Out for Delivery' ? 'Updating...' : 'Mark as Out for Delivery'}
                      </button>
                    )}
                    
                    {order.IsOut_for_Delivery === 'Y' && order.IsDelivered !== 'Y' && (
                      <button
                        onClick={() => updateOrderStatus('Delivered')}
                        disabled={updatingStatus === 'Delivered'}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {updatingStatus === 'Delivered' ? 'Updating...' : 'Mark as Delivered'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Status Timeline */}
              <div className="mt-8">
                <h4 className="text-md font-medium text-gray-900 mb-3">Status Timeline</h4>
                <div className="flow-root">
                  <ul className="-mb-8">
                    {statusInfo?.map((step, index) => (
                      <li key={step.key}>
                        <div className="relative pb-8">
                          {index !== statusInfo.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                order[step.key as keyof OrderDetails] === 'Y' 
                                  ? 'bg-green-500' 
                                  : 'bg-gray-300'
                              }`}>
                                {order[step.key as keyof OrderDetails] === 'Y' ? (
                                  <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className={`text-sm ${order[step.key as keyof OrderDetails] === 'Y' ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                                  {step.label}
                                </p>
                                {order[step.key as keyof OrderDetails] === 'Y' && step.time && (
                                  <p className="text-xs text-gray-500">
                                    {new Date(step.time).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}