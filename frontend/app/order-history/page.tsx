"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Package, Truck, CheckCircle, Clock } from "lucide-react"
import Link from "next/link"
import { validateCustomerAuth, performCustomerLogout } from "../../utils/auth"

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
  // Add ModelId for navigation
  ModelId: number
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

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'shipped' | 'delivered'>('all')

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
        
        console.log('Order history response status:', response.status);
        console.log('Order history response ok:', response.ok);
        
        if (response.ok) {
          const data = await response.json()
          console.log('Order history data received:', data);
          // Ensure orders is always an array
          const ordersData = Array.isArray(data.orders) ? data.orders : []
          console.log('Processed orders data:', ordersData);
          setOrders(ordersData)
        } else if (response.status === 401) {
          console.log('Order history: Unauthorized, logging out');
          performCustomerLogout('/')
        } else {
          const errorData = await response.json()
          console.log('Order history error data:', errorData);
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

  // Filter orders based on active filter
  const filteredOrders = Array.isArray(orders) ? orders.filter(order => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'pending') return order.OrderStatus === 'Pending'
    if (activeFilter === 'shipped') return order.OrderStatus === 'Shipped'
    if (activeFilter === 'delivered') return order.OrderStatus === 'Delivered'
    return true
  }) : []

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-xl">Loading your order history...</div>
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
      <h1 className="text-3xl font-bold mb-8">Order History</h1>
      
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-4 mb-8">
        <button
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            activeFilter === 'all' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          onClick={() => setActiveFilter('all')}
        >
          <Package className="mr-2 h-4 w-4" />
          All Orders
        </button>
        
        <button
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            activeFilter === 'pending' 
              ? 'bg-yellow-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          onClick={() => setActiveFilter('pending')}
        >
          <Clock className="mr-2 h-4 w-4" />
          Pending Orders
        </button>
        
        <button
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            activeFilter === 'shipped' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          onClick={() => setActiveFilter('shipped')}
        >
          <Truck className="mr-2 h-4 w-4" />
          Shipped Orders
        </button>
        
        <button
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            activeFilter === 'delivered' 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          onClick={() => setActiveFilter('delivered')}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Delivered Orders
        </button>
      </div>
      
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {activeFilter === 'all' ? 'No orders yet' : 
             activeFilter === 'pending' ? 'No pending orders' :
             activeFilter === 'shipped' ? 'No shipped orders' :
             'No delivered orders'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {activeFilter === 'all' ? "You haven't placed any orders yet." : 
             activeFilter === 'pending' ? "You don't have any pending orders." :
             activeFilter === 'shipped' ? "You don't have any shipped orders yet." :
             "You haven't had any deliveries yet."}
          </p>
          <Link href="/models">
            <Button>Start Shopping</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card 
              key={order.PuchaseId} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                // Navigate to the model page when order is clicked
                window.location.href = `/models/${order.ModelId}`;
              }}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Order #{order.PuchaseId}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Placed on {new Date(order.OrderDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.OrderStatus === 'Delivered' ? 'bg-green-100 text-green-800' :
                    order.OrderStatus === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                    order.OrderStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.OrderStatus}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Total: ₹{Number(order.TotalAmount).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      Payment: {order.PaymentStatus} via {order.PaymentMode}
                    </p>
                  </div>
                  <Button 
                    onClick={(e) => {
                      // Prevent card click when button is clicked
                      e.stopPropagation();
                      window.location.href = `/models/${order.ModelId}`;
                    }}
                  >
                    Shop More
                  </Button>
                </div>
                {order.Vendor && order.Courier && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="font-medium mb-2">Tracking Details</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Courier</p>
                        <p>{order.Courier ? `Courier ID: ${order.Courier}` : 'Not assigned'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tracking Number</p>
                        <p>{order.TrackingNo || 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ready for Pickup</p>
                        <p>
                          {order.IsReady_for_Pickup_by_Courier === 'Y' 
                            ? new Date(order.Ready_for_Pickup_by_CourierTimeStamp).toLocaleString() 
                            : 'No'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Picked by Courier</p>
                        <p>
                          {order.IsPicked_by_Courier === 'Y' 
                            ? new Date(order.Picked_by_CourierTimeStamp).toLocaleString() 
                            : 'No'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Dispatched</p>
                        <p>
                          {order.IsDispatched === 'Y'
                            ? new Date(order.DispatchedTimeStamp).toLocaleString()
                            : 'No'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Out for Delivery</p>
                        <p>
                          {order.IsOut_for_Delivery === 'Y'
                            ? new Date(order.Out_for_DeliveryTimeStamp).toLocaleString()
                            : 'No'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Delivered</p>
                        <p>
                          {order.IsDelivered === 'Y'
                            ? new Date(order.DeliveryTimeStamp).toLocaleString()
                            : 'No'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}