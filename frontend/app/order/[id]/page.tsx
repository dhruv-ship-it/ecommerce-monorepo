"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Package, Truck, CheckCircle } from "lucide-react"
import Link from "next/link"
import { validateCustomerAuth, performCustomerLogout } from "../../../utils/auth"
import { useRouter } from "next/navigation"

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

// Define the order item interface
interface OrderItem {
  VendorProductCustomerCourierId: number;
  Customer: number;
  Product: number;
  Vendor: number;
  Courier: number;
  MRP_SS: string;
  Discount_SS: string;
  GST_SS: string;
  PurchaseQty: number;
  OrderCreationTimeStamp: string;
  IsReady_for_Pickup_by_Courier: string;
  TrackingNo: string;
  IsPicked_by_Courier: string;
  IsDispatched: string;
  IsOut_for_Delivery: string;
  IsDelivered: string;
  IsPartialDelivery: string;
  IsReturned: string;
  IsDeleted: string;
  RecordCreationLogin: string;
  ProductName: string;
  VendorName: string;
  CourierName: string;
  ModelName: string;
  ColorName: string;
  SizeName: string;
}

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function fetchOrder() {
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
        // Fetch order details
        const response = await fetch(`${API}/order/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setOrder(data.order || null)
        } else if (response.status === 401) {
          performCustomerLogout('/')
          return
        } else if (response.status === 404) {
          setError('Order not found')
          return
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to fetch order')
          return
        }
        
        // Fetch order items (in a real implementation, this would come from a separate endpoint)
        // For now, we'll mock this data since the backend doesn't have a specific endpoint for order items
        // In a production environment, you would have a separate API endpoint for this
        /*
        const itemsResponse = await fetch(`${API}/order/${params.id}/items`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (itemsResponse.ok) {
          const itemsData = await itemsResponse.json()
          setOrderItems(itemsData.items || [])
        }
        */
      } catch (err) {
        console.error('Error fetching order:', err)
        setError('Failed to fetch order')
      } finally {
        setLoading(false)
      }
    }
    
    fetchOrder()
  }, [params.id])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-xl">Loading order details...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-red-500 mb-4">Error: {error}</div>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-xl">Order not found</div>
        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Order Details</h1>
        <Link href="/order-history">
          <Button variant="outline">Back to Orders</Button>
        </Link>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">Order #{order.PuchaseId}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Placed on {new Date(order.OrderDate).toLocaleDateString()}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              order.OrderStatus === 'Delivered' ? 'bg-green-100 text-green-800' :
              order.OrderStatus === 'Shipped' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {order.OrderStatus}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Order Total</span>
                  <span className="font-medium">₹{Number(order.TotalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Status</span>
                  <span className={order.PaymentStatus === 'Completed' ? 'text-green-600' : 'text-yellow-600'}>
                    {order.PaymentStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method</span>
                  <span>{order.PaymentMode}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Delivery Information</h3>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Truck className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Standard Delivery</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Estimated delivery: 3-5 business days
                </div>
                <div className="text-sm text-muted-foreground">
                  Tracking Number: Not available yet
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* In a real implementation, this would show actual order items */}
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
              <div className="flex-1">
                <h3 className="font-medium">Product Name</h3>
                <p className="text-sm text-muted-foreground">Quantity: {orderItems.length > 0 ? orderItems[0].PurchaseQty : 1}</p>
                <p className="text-sm font-medium">₹{order.TotalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-6 flex justify-end space-x-2">
        <Button>Reorder</Button>
      </div>
    </div>
  )
}








