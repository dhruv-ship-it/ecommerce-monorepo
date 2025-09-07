"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Package, Truck, CheckCircle, Clock, MapPin } from "lucide-react"
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
}

export default function OrderTrackingDashboard() {
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
        
        if (response.ok) {
          const data = await response.json()
          // Ensure orders is always an array
          setOrders(Array.isArray(data.orders) ? data.orders : [])
        } else if (response.status === 401) {
          performCustomerLogout('/')
        } else {
          const errorData = await response.json()
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

  // Determine current status for an order
  const getOrderStatus = (order: Order) => {
    switch (order.OrderStatus) {
      case 'Delivered':
        return { status: 'delivered', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-500' };
      case 'Shipped':
      case 'Out for Delivery':
        return { status: 'shipped', icon: <Truck className="h-4 w-4" />, color: 'bg-blue-500' };
      case 'Pending':
      case 'No Courier Available':
        return { status: 'pending', icon: <Clock className="h-4 w-4" />, color: 'bg-yellow-500' };
      default:
        return { status: 'unknown', icon: <Package className="h-4 w-4" />, color: 'bg-gray-500' };
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-xl">Loading your order tracking dashboard...</div>
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

  // Add safety checks for order filtering
  const activeOrders = Array.isArray(orders) ? orders.filter(order => order.OrderStatus !== 'Delivered') : [];
  const deliveredOrders = Array.isArray(orders) ? orders.filter(order => order.OrderStatus === 'Delivered') : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Order Tracking Dashboard</h1>
      
      {/* Active Orders Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Active Orders ({activeOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No active orders at the moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order) => {
                const statusInfo = getOrderStatus(order);
                return (
                  <div key={order.PuchaseId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-200 border-2 border-dashed rounded-xl w-12 h-12" />
                      <div>
                        <h3 className="font-medium">Order #{order.PuchaseId}</h3>
                        <p className="text-sm text-muted-foreground">
                          Placed on {new Date(order.OrderDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${statusInfo.color}`}></div>
                        <span className="text-sm capitalize">{order.OrderStatus}</span>
                      </div>
                      <Link href={`/order/tracking/${order.PuchaseId}`}>
                        <Button variant="outline" size="sm">
                          Track
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Delivered Orders Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Delivered Orders ({deliveredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deliveredOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No delivered orders yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deliveredOrders.map((order) => (
                <div key={order.PuchaseId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-200 border-2 border-dashed rounded-xl w-12 h-12" />
                    <div>
                      <h3 className="font-medium">Order #{order.PuchaseId}</h3>
                      <p className="text-sm text-muted-foreground">
                        Delivered on {new Date(order.OrderDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm">Delivered</span>
                    </div>
                    <Link href={`/order/${order.PuchaseId}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* View All Orders Link */}
      <div className="mt-8 text-center">
        <Link href="/order-history">
          <Button variant="outline">
            View Complete Order History
          </Button>
        </Link>
      </div>
    </div>
  )
}