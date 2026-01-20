"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Package, Truck, CheckCircle, Clock, X } from "lucide-react"
import Link from "next/link"
import { validateCustomerAuth, performCustomerLogout } from "../../../utils/auth"

const API = process.env.NEXT_PUBLIC_API_URL;

interface Order {
  PuchaseId: number
  ProductId: number
  CustomerId: number
  OrderDate: string
  OrderStatus: string
  TotalAmount: number
  PaymentStatus: string
  PaymentMode: string
  // Add tracking information from vendorproductcustomercourier
  Vendor: number
  Courier: number
  TrackingNo: string
  IsReady_for_Pickup_by_Courier: string
  Ready_for_Pickup_by_CourierTimeStamp: string
  IsPicked_by_Courier: string
  Picked_by_CourierTimeStamp: string
  IsDispatched: string
  DispatchedTimeStamp: string
  IsOut_for_Delivery: string
  Out_for_DeliveryTimeStamp: string
  IsDelivered: string
  DeliveryTimeStamp: string
}

export default function PendingOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOrders() {
      // Validate authentication
      if (!validateCustomerAuth()) {
        performCustomerLogout('/')
        return
      }
      
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Authentication required')
        setLoading(false)
        return
      }
      
      try {
        const response = await fetch(`${API}/order/history`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        console.log('Pending orders response status:', response.status);
        console.log('Pending orders response ok:', response.ok);
        
        if (response.ok) {
          const data = await response.json()
          console.log('Pending orders data received:', data);
          // Ensure data.orders is an array before filtering
          const ordersArray = Array.isArray(data.orders) ? data.orders : []
          console.log('Pending orders array:', ordersArray);
          // Filter pending orders (Pending, Shipped, etc.)
          const pendingOrders = ordersArray.filter((order: Order) => 
            order.OrderStatus !== 'Delivered'
          )
          console.log('Filtered pending orders:', pendingOrders);
          setOrders(pendingOrders)
        } else if (response.status === 401) {
          console.log('Pending orders: Unauthorized, logging out');
          performCustomerLogout('/')
        } else {
          const errorData = await response.json()
          console.log('Pending orders error data:', errorData);
          setError(errorData.error || 'Failed to fetch orders')
        }
      } catch (err) {
        console.error('Error fetching orders:', err)
        setError('Failed to fetch orders')
      } finally {
        setLoading(false)
      }
    }
    
    fetchOrders()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-xl">Loading your pending orders...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-red-500 mb-4">Error: {error}</div>
        <Link href="/models">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Pending Orders</h1>
        <Link href="/order-history">
          <Button variant="outline">View All Orders</Button>
        </Link>
      </div>
      
      {Array.isArray(orders) && orders.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No pending orders</h2>
          <p className="text-muted-foreground mb-6">You don't have any pending orders at the moment.</p>
          <Link href="/models">
            <Button>Start Shopping</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.isArray(orders) && orders.map((order) => (
            <Card key={order.PuchaseId}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Order #{order.PuchaseId}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Placed on {new Date(order.OrderDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.OrderStatus === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.OrderStatus}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Total: ₹{Number(order.TotalAmount).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      Payment: {order.PaymentStatus} via {order.PaymentMode}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Link href={`/order/${order.PuchaseId}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                    <Link href={`/order/tracking/${order.PuchaseId}`}>
                      <Button size="sm">
                        Track Order
                      </Button>
                    </Link>
                  </div>
                </div>
                {order.Vendor && order.Courier && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="font-medium mb-2">Order Tracking Progress</h3>
                    <div className="space-y-3">
                      {/* Order Placed */}
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium">Order Placed</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.OrderDate).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Courier Assigned */}
                      <div className="flex">
                        <div className="flex flex-col items-center">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full ${
                            order.Courier ? 'bg-green-500' : 'bg-gray-300'
                          } flex items-center justify-center`}>
                            {order.Courier ? (
                              <CheckCircle className="h-4 w-4 text-white" />
                            ) : (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          {order.IsPicked_by_Courier !== 'N' && (
                            <div className={`h-full w-0.5 ${
                              order.Courier ? 'bg-green-500' : 'bg-gray-300'
                            } flex-grow`}></div>
                          )}
                        </div>
                        <div className="ml-3 pb-3">
                          <p className="text-sm font-medium">
                            {order.Courier ? 'Courier Assigned' : 'Waiting for Courier Assignment'}
                          </p>
                          {order.Courier && (
                            <p className="text-xs text-muted-foreground">
                              Courier ID: {order.Courier}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Courier Accepted */}
                      <div className="flex">
                        <div className="flex flex-col items-center">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full ${
                            order.IsPicked_by_Courier === 'Y' ? 'bg-green-500' : 
                            order.IsPicked_by_Courier === 'P' ? 'bg-yellow-500' : 
                            order.IsPicked_by_Courier === 'N' ? 'bg-red-500' : 
                            'bg-gray-300'
                          } flex items-center justify-center`}>
                            {order.IsPicked_by_Courier === 'Y' ? (
                              <CheckCircle className="h-4 w-4 text-white" />
                            ) : order.IsPicked_by_Courier === 'P' ? (
                              <Clock className="h-4 w-4 text-white" />
                            ) : order.IsPicked_by_Courier === 'N' ? (
                              <X className="h-4 w-4 text-white" />
                            ) : (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          {order.IsPicked_by_Courier === 'Y' && (
                            <div className="h-full w-0.5 bg-green-500 flex-grow"></div>
                          )}
                        </div>
                        <div className="ml-3 pb-3">
                          <p className={`text-sm font-medium ${
                            order.IsPicked_by_Courier === 'Y' ? 'text-green-700' :
                            order.IsPicked_by_Courier === 'P' ? 'text-yellow-700' :
                            order.IsPicked_by_Courier === 'N' ? 'text-red-700' :
                            'text-gray-500'
                          }`}>
                            {order.IsPicked_by_Courier === 'Y' ? 'Courier Accepted' :
                             order.IsPicked_by_Courier === 'P' ? 'Courier Pending Acceptance' :
                             order.IsPicked_by_Courier === 'N' ? 'Courier Rejected' :
                             'Waiting for Courier'}
                          </p>
                          {order.IsPicked_by_Courier === 'Y' && order.Picked_by_CourierTimeStamp && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.Picked_by_CourierTimeStamp).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Ready for Pickup */}
                      <div className="flex">
                        <div className="flex flex-col items-center">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full ${
                            order.IsReady_for_Pickup_by_Courier === 'Y' ? 'bg-green-500' : 'bg-gray-300'
                          } flex items-center justify-center`}>
                            {order.IsReady_for_Pickup_by_Courier === 'Y' ? (
                              <CheckCircle className="h-4 w-4 text-white" />
                            ) : (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          {order.IsReady_for_Pickup_by_Courier === 'Y' && (
                            <div className="h-full w-0.5 bg-green-500 flex-grow"></div>
                          )}
                        </div>
                        <div className="ml-3 pb-3">
                          <p className="text-sm font-medium">
                            {order.IsReady_for_Pickup_by_Courier === 'Y' ? 'Ready for Pickup' : 'Preparing Order'}
                          </p>
                          {order.IsReady_for_Pickup_by_Courier === 'Y' && order.Ready_for_Pickup_by_CourierTimeStamp && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.Ready_for_Pickup_by_CourierTimeStamp).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Dispatched */}
                      <div className="flex">
                        <div className="flex flex-col items-center">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full ${
                            order.IsDispatched === 'Y' ? 'bg-green-500' : 'bg-gray-300'
                          } flex items-center justify-center`}>
                            {order.IsDispatched === 'Y' ? (
                              <CheckCircle className="h-4 w-4 text-white" />
                            ) : (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          {order.IsDispatched === 'Y' && (
                            <div className="h-full w-0.5 bg-green-500 flex-grow"></div>
                          )}
                        </div>
                        <div className="ml-3 pb-3">
                          <p className="text-sm font-medium">
                            {order.IsDispatched === 'Y' ? 'Order Dispatched' : 'Waiting for Dispatch'}
                          </p>
                          {order.IsDispatched === 'Y' && order.DispatchedTimeStamp && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.DispatchedTimeStamp).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Out for Delivery */}
                      <div className="flex">
                        <div className="flex flex-col items-center">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full ${
                            order.IsOut_for_Delivery === 'Y' ? 'bg-green-500' : 'bg-gray-300'
                          } flex items-center justify-center`}>
                            {order.IsOut_for_Delivery === 'Y' ? (
                              <CheckCircle className="h-4 w-4 text-white" />
                            ) : (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          {order.IsOut_for_Delivery === 'Y' && (
                            <div className="h-full w-0.5 bg-green-500 flex-grow"></div>
                          )}
                        </div>
                        <div className="ml-3 pb-3">
                          <p className="text-sm font-medium">
                            {order.IsOut_for_Delivery === 'Y' ? 'Out for Delivery' : 'Not Out for Delivery'}
                          </p>
                          {order.IsOut_for_Delivery === 'Y' && order.Out_for_DeliveryTimeStamp && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.Out_for_DeliveryTimeStamp).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Delivered */}
                      <div className="flex">
                        <div className="flex flex-col items-center">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full ${
                            order.IsDelivered === 'Y' ? 'bg-green-500' : 'bg-gray-300'
                          } flex items-center justify-center`}>
                            {order.IsDelivered === 'Y' ? (
                              <CheckCircle className="h-4 w-4 text-white" />
                            ) : (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium">
                            {order.IsDelivered === 'Y' ? 'Order Delivered' : 'Not Delivered'}
                          </p>
                          {order.IsDelivered === 'Y' && order.DeliveryTimeStamp && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.DeliveryTimeStamp).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}