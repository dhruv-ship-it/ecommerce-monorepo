"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Package, Truck, CheckCircle, Clock, MapPin, User, Phone, X } from "lucide-react"
import Link from "next/link"
import { validateCustomerAuth, performCustomerLogout } from "../../../../utils/auth"
import { useRouter } from "next/navigation"

const API = process.env.NEXT_PUBLIC_API_URL;

interface OrderTracking {
  PurchaseId: number;
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
  Ready_for_Pickup_by_CourierTimeStamp: string;
  TrackingNo: string;
  IsPicked_by_Courier: string;
  Picked_by_CourierTimeStamp: string;
  IsDispatched: string;
  DispatchedTimeStamp: string;
  IsOut_for_Delivery: string;
  Out_for_DeliveryTimeStamp: string;
  IsDelivered: string;
  DeliveryTimeStamp: string;
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
  OrderDate: string;
  TotalAmount: number;
  OrderStatus: string;
  CustomerName: string;
  CustomerEmail: string;
  VendorMobile: string;
  CourierMobile: string;
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

export default function OrderTrackingPage({ params }: { params: { id: string } }) {
  const [trackingInfo, setTrackingInfo] = useState<OrderTracking | null>(null)
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function fetchTrackingInfo() {
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
        // Fetch tracking info from the backend
        const response = await fetch(`${API}/order/${params.id}/tracking`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setTrackingInfo(data.order || null)
          setTrackingEvents(data.trackingEvents || [])
        } else if (response.status === 401) {
          performCustomerLogout('/')
        } else if (response.status === 404) {
          setError('Tracking information not found')
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to fetch tracking information')
        }
      } catch (err) {
        console.error('Error fetching tracking info:', err)
        setError('Failed to fetch tracking information')
      } finally {
        setLoading(false)
      }
    }
    
    fetchTrackingInfo()
  }, [params.id])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-xl">Loading tracking information...</div>
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

  if (!trackingInfo) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-xl">Tracking information not found</div>
        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Order Tracking</h1>
        <Link href="/order-history">
          <Button variant="outline">Back to Order History</Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Tracking Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">Order #{trackingInfo.PurchaseId}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Placed on {new Date(trackingInfo.OrderDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Tracking Number</p>
                  <p className="text-sm font-mono">{trackingInfo.TrackingNo || 'Not available yet'}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
                <div>
                  <h3 className="font-medium">{trackingInfo.ProductName || 'Product'}</h3>
                  <p className="text-sm text-muted-foreground">
                    Qty: {trackingInfo.PurchaseQty}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total: ₹{Number(trackingInfo.TotalAmount).toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="font-medium mb-4">Tracking Progress</h3>
                
                <div className="space-y-4">
                  {/* Order Placed */}
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="font-medium">Order Placed</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(trackingInfo.OrderDate).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Courier Assignment Status */}
                  <div className="flex">
                    <div className="flex flex-col items-center">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${
                        trackingInfo.Courier ? 'bg-green-500' : 'bg-gray-300'
                      } flex items-center justify-center`}>
                        {trackingInfo.Courier ? (
                          <CheckCircle className="h-5 w-5 text-white" />
                        ) : (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      {trackingInfo.IsPicked_by_Courier !== 'N' && (
                        <div className={`h-full w-0.5 ${
                          trackingInfo.Courier ? 'bg-green-500' : 'bg-gray-300'
                        } flex-grow my-1`}></div>
                      )}
                    </div>
                    <div className="ml-4 pb-3">
                      <p className="font-medium">
                        {trackingInfo.Courier ? 'Courier Assigned' : 'Waiting for Courier Assignment'}
                      </p>
                      {trackingInfo.Courier && (
                        <p className="text-sm text-muted-foreground">
                          {trackingInfo.CourierName || `Courier ID: ${trackingInfo.Courier}`}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Ready for Pickup */}
                  <div className="flex">
                    <div className="flex flex-col items-center">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${
                        trackingInfo.IsReady_for_Pickup_by_Courier === 'Y' ? 'bg-green-500' : 'bg-gray-300'
                      } flex items-center justify-center`}>
                        {trackingInfo.IsReady_for_Pickup_by_Courier === 'Y' ? (
                          <CheckCircle className="h-5 w-5 text-white" />
                        ) : (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      {trackingInfo.IsReady_for_Pickup_by_Courier === 'Y' && (
                        <div className="h-full w-0.5 bg-green-500 flex-grow my-1"></div>
                      )}
                    </div>
                    <div className="ml-4 pb-3">
                      <p className="font-medium">
                        {trackingInfo.IsReady_for_Pickup_by_Courier === 'Y' ? 'Ready for Pickup' : 'Preparing Order'}
                      </p>
                      {trackingInfo.IsReady_for_Pickup_by_Courier === 'Y' && trackingInfo.Ready_for_Pickup_by_CourierTimeStamp && (
                        <p className="text-sm text-muted-foreground">
                          {new Date(trackingInfo.Ready_for_Pickup_by_CourierTimeStamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Courier Picked Up Status */}
                  <div className="flex">
                    <div className="flex flex-col items-center">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${
                        trackingInfo.IsPicked_by_Courier === 'Y' ? 'bg-green-500' : 
                        'bg-gray-300'
                      } flex items-center justify-center`}>
                        {trackingInfo.IsPicked_by_Courier === 'Y' ? (
                          <CheckCircle className="h-5 w-5 text-white" />
                        ) : (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      {trackingInfo.IsPicked_by_Courier === 'Y' && (
                        <div className="h-full w-0.5 bg-green-500 flex-grow my-1"></div>
                      )}
                    </div>
                    <div className="ml-4 pb-3">
                      <p className={`font-medium ${
                        trackingInfo.IsPicked_by_Courier === 'Y' ? 'text-green-700' :
                        'text-gray-500'
                      }`}>
                        {trackingInfo.IsPicked_by_Courier === 'Y' ? 'Courier Picked Up' :
                         'Waiting for Courier'}
                      </p>
                      {trackingInfo.IsPicked_by_Courier === 'Y' && trackingInfo.Picked_by_CourierTimeStamp && (
                        <p className="text-sm text-muted-foreground">
                          {new Date(trackingInfo.Picked_by_CourierTimeStamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Dispatched */}
                  <div className="flex">
                    <div className="flex flex-col items-center">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${
                        trackingInfo.IsDispatched === 'Y' ? 'bg-green-500' : 'bg-gray-300'
                      } flex items-center justify-center`}>
                        {trackingInfo.IsDispatched === 'Y' ? (
                          <CheckCircle className="h-5 w-5 text-white" />
                        ) : (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      {trackingInfo.IsDispatched === 'Y' && (
                        <div className="h-full w-0.5 bg-green-500 flex-grow my-1"></div>
                      )}
                    </div>
                    <div className="ml-4 pb-3">
                      <p className="font-medium">
                        {trackingInfo.IsDispatched === 'Y' ? 'Order Dispatched' : 'Waiting for Dispatch'}
                      </p>
                      {trackingInfo.IsDispatched === 'Y' && trackingInfo.DispatchedTimeStamp && (
                        <p className="text-sm text-muted-foreground">
                          {new Date(trackingInfo.DispatchedTimeStamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Out for Delivery */}
                  <div className="flex">
                    <div className="flex flex-col items-center">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${
                        trackingInfo.IsOut_for_Delivery === 'Y' ? 'bg-green-500' : 'bg-gray-300'
                      } flex items-center justify-center`}>
                        {trackingInfo.IsOut_for_Delivery === 'Y' ? (
                          <CheckCircle className="h-5 w-5 text-white" />
                        ) : (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      {trackingInfo.IsOut_for_Delivery === 'Y' && (
                        <div className="h-full w-0.5 bg-green-500 flex-grow my-1"></div>
                      )}
                    </div>
                    <div className="ml-4 pb-3">
                      <p className="font-medium">
                        {trackingInfo.IsOut_for_Delivery === 'Y' ? 'Out for Delivery' : 'Not Out for Delivery'}
                      </p>
                      {trackingInfo.IsOut_for_Delivery === 'Y' && trackingInfo.Out_for_DeliveryTimeStamp && (
                        <p className="text-sm text-muted-foreground">
                          {new Date(trackingInfo.Out_for_DeliveryTimeStamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Delivered */}
                  <div className="flex">
                    <div className="flex flex-col items-center">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${
                        trackingInfo.IsDelivered === 'Y' ? 'bg-green-500' : 'bg-gray-300'
                      } flex items-center justify-center`}>
                        {trackingInfo.IsDelivered === 'Y' ? (
                          <CheckCircle className="h-5 w-5 text-white" />
                        ) : (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="font-medium">
                        {trackingInfo.IsDelivered === 'Y' ? 'Order Delivered' : 'Not Delivered'}
                      </p>
                      {trackingInfo.IsDelivered === 'Y' && trackingInfo.DeliveryTimeStamp && (
                        <p className="text-sm text-muted-foreground">
                          {new Date(trackingInfo.DeliveryTimeStamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar with Delivery Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Vendor</h3>
                  <p className="text-sm">{trackingInfo.VendorName || 'N/A'}</p>
                  {trackingInfo.VendorMobile && (
                    <p className="text-sm text-muted-foreground">Phone: {trackingInfo.VendorMobile}</p>
                  )}
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Courier</h3>
                  <p className="text-sm">{trackingInfo.CourierName || 'Not assigned yet'}</p>
                  {trackingInfo.CourierMobile && (
                    <p className="text-sm text-muted-foreground">Phone: {trackingInfo.CourierMobile}</p>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Customer: {trackingInfo.CustomerName || 'N/A'}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{trackingInfo.CustomerEmail || 'N/A'}</span>
                </div>
                
                {trackingInfo.CourierName && trackingInfo.CourierMobile && (
                  <Button className="w-full mt-4">Contact Courier</Button>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Product Price</span>
                  <span>₹{parseFloat(trackingInfo.MRP_SS || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span className="text-green-600">-₹{(
                    parseFloat(trackingInfo.MRP_SS || '0') * 
                    parseFloat(trackingInfo.Discount_SS || '0') / 100
                  ).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST</span>
                  <span>₹{parseFloat(trackingInfo.GST_SS || '0').toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>₹{Number(trackingInfo.TotalAmount || 0).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
















