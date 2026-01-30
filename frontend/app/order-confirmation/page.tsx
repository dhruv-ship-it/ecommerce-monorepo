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

interface RecommendedProduct {
  productId: number;
  modelId: number;
  productName: string;
  price: number;
  category: string;
  subcategory: string;
  score: number;
  reason: string;
}

export default function OrderConfirmationPage() {
  const [latestOrder, setLatestOrder] = useState<Order | null>(null)
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if we have order data from session storage
    const storedData = sessionStorage.getItem('orderConfirmationData');
    
    if (storedData) {
      try {
        const { order, recommendations, timestamp } = JSON.parse(storedData);
        
        // Check if data is still valid (less than 5 minutes old)
        const now = Date.now();
        const dataAge = now - timestamp;
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        if (dataAge < fiveMinutes) {
          console.log('DEBUG: Loading order data from session storage:', order);
          console.log('DEBUG: Loading recommendations from session storage:', recommendations);
          
          setLatestOrder(order);
          setRecommendedProducts(recommendations || []);
        } else {
          console.log('DEBUG: Order confirmation data expired (older than 5 minutes)');
          // Clear expired data
          sessionStorage.removeItem('orderConfirmationData');
        }
      } catch (err) {
        console.error('Error parsing session storage data:', err);
        sessionStorage.removeItem('orderConfirmationData');
      }
    } else {
      console.log('DEBUG: No order confirmation data found');
    }
    
    setLoading(false);
  }, []);

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
            
            {/* Recommended Products Section */}
            {recommendedProducts && recommendedProducts.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold mb-6 text-center">Recommended For You</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {recommendedProducts.map((product) => (
                    <div key={product.productId} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                      <h3 className="font-semibold text-lg mb-2">{product.productName}</h3>
                      <p className="text-gray-600 text-sm mb-1">{product.category}</p>
                      <p className="text-gray-600 text-sm mb-3">{product.subcategory}</p>
                      <p className="text-lg font-bold text-blue-600">₹{product.price.toFixed(2)}</p>
                      <div className="mt-3">
                        <Link href={`/models/${product.modelId}`}>
                          <Button variant="outline" className="w-full">
                            View Product
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  )
}