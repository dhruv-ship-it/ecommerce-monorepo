"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import Link from "next/link"
import { validateCustomerAuth, performCustomerLogout } from "../../utils/auth"

const API = process.env.NEXT_PUBLIC_API_URL;

interface Order {
  PuchaseId: number
  OrderDate: string
  TotalAmount: number
  PaymentStatus: string
  PaymentMode: string
}

export default function OrderConfirmationPage() {
  const [latestOrder, setLatestOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLatestOrder() {
      // Validate authentication
      if (!validateCustomerAuth()) {
        performCustomerLogout('/')
        return
      }
      
      const token = localStorage.getItem('token')
      if (!token) {
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
          // Get the most recent order
          if (data.orders && data.orders.length > 0) {
            setLatestOrder(data.orders[0])
          }
        } else if (response.status === 401) {
          performCustomerLogout('/')
        }
      } catch (err) {
        console.error('Error fetching order:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchLatestOrder()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-xl">Loading order confirmation...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold">Order Placed Successfully!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Thank you for your order. We've received your order and are processing it. 
              You'll receive updates on your order status shortly.
            </p>
            
            {latestOrder && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
                <h3 className="font-medium mb-2">Order Details</h3>
                <p className="text-sm text-muted-foreground">Order Number: #{latestOrder.PuchaseId}</p>
                <p className="text-sm text-muted-foreground">
                  Order Date: {new Date(latestOrder.OrderDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Amount: ₹{Number(latestOrder.TotalAmount).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Payment Status: {latestOrder.PaymentStatus}
                </p>
                <p className="text-sm text-muted-foreground">
                  Payment Method: {latestOrder.PaymentMode}
                </p>
                <p className="text-sm text-muted-foreground">Estimated Delivery: 3-5 business days</p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/models">
                <Button variant="outline" className="w-full sm:w-auto">
                  Continue Shopping
                </Button>
              </Link>
              <Link href="/order-history">
                <Button className="w-full sm:w-auto">
                  View Order History
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}