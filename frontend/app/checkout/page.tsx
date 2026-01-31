"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { MapPin, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { validateCustomerAuth, performCustomerLogout } from "../../utils/auth"

const API = process.env.NEXT_PUBLIC_API_URL;

// Define the cart item interface
interface CartItem {
  ShoppingCartId: number;
  ProductId: number;
  VendorProductId: number;
  Quantity: number;
  ProductName: string;
  MRP_SS: string;
  Discount: string;
  GST_SS: string;
  StockQty: number;
  VendorName: string;
  CourierName: string;
  ColorName: string;
  SizeName: string;
  ModelName: string;
}

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerDetails, setCustomerDetails] = useState({
    address: "",
    locality: "",
    district: "",
    state: "",
    country: "",
    continent: "",
    hasLocalityId: false  // Track if customer had a locality ID
  });
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Fetch cart items separately
  useEffect(() => {
    async function fetchCart() {
      // Validate authentication
      if (!validateCustomerAuth()) {
        performCustomerLogout('/auth/signin')
        return
      }
      
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Authentication required')
        setLoading(false)
        return
      }
      
      try {
        const response = await fetch(`${API}/cart`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setCartItems(data.cart || [])
        } else if (response.status === 401) {
          performCustomerLogout('/auth/signin')
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to fetch cart')
        }
      } catch (err) {
        console.error("Cart fetch error:", err)
        setError('Failed to fetch cart items')
      }
    }
    
    fetchCart()
  }, [])

  // Fetch customer details including address hierarchy
  useEffect(() => {
    async function fetchCustomerDetails() {
      // Validate authentication
      if (!validateCustomerAuth()) {
        performCustomerLogout('/auth/signin')
        return
      }
      
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Authentication required')
        setLoading(false)
        return
      }
      
      try {
        // First, get customer information
        const customerResponse = await fetch(`${API}/api/customer/info`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (customerResponse.ok) {
          const customerData = await customerResponse.json()
          console.log("Customer data received:", customerData);
          
          // Get the customer's address and locality ID
          const customerAddress = customerData.customer?.Address || ""
          const customerLocalityId = customerData.customer?.Locality || 0
          
          console.log("Customer address:", customerAddress);
          console.log("Customer locality ID:", customerLocalityId);
          
            if (customerLocalityId && customerLocalityId !== 0) {
          try {
            console.log("Fetching address hierarchy for locality ID:", customerLocalityId);
            // Note: This endpoint requires authorization since it's under /api/customer
            const token = localStorage.getItem('token');
            const hierarchyResponse = await fetch(`${API}/api/customer/address-hierarchy/${customerLocalityId}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
                      
            console.log("Hierarchy API response status:", hierarchyResponse.status);
                      
            if (hierarchyResponse.ok) {
              const hierarchyData = await hierarchyResponse.json()
              console.log("Hierarchy data received:", hierarchyData);
                        
              setCustomerDetails({
                address: customerAddress,
                locality: hierarchyData.locality || "",
                district: hierarchyData.district || "",
                state: hierarchyData.state || "",
                country: hierarchyData.country || "",
                continent: hierarchyData.continent || "",
                hasLocalityId: true  // Mark that we had a locality ID
              })
            } else {
              // Handle API errors gracefully
              console.warn("Failed to fetch address hierarchy, using basic address only")
              console.warn("Response status:", hierarchyResponse.status);
              const errorText = await hierarchyResponse.text();
              console.warn("Error response:", errorText);
                        
              setCustomerDetails({
                address: customerAddress,
                locality: "",
                district: "",
                state: "",
                country: "",
                continent: "",
                hasLocalityId: true  // Mark that we had a locality ID
              })
            }
          } catch (hierarchyError) {
            console.error("Address hierarchy fetch error:", hierarchyError)
            // Fallback to just the address
            setCustomerDetails({
              address: customerAddress,
              locality: "",
              district: "",
              state: "",
              country: "",
              continent: "",
              hasLocalityId: true  // Mark that we had a locality ID
            })
          }
        } else {
            // If no locality ID, just set the address
            setCustomerDetails({
              address: customerAddress,
              locality: "",
              district: "",
              state: "",
              country: "",
              continent: "",
              hasLocalityId: false  // Mark that we did not have a locality ID
            })
          }
        } else if (customerResponse.status === 401) {
          performCustomerLogout('/auth/signin')
        } else {
          const errorData = await customerResponse.json()
          setError(errorData.error || 'Failed to fetch customer details')
        }
      } catch (err) {
        console.error("Customer details fetch error:", err)
        setError('Failed to fetch customer details')
      } finally {
        setLoading(false)
      }
    }
    
    fetchCustomerDetails()
  }, [])

  const subtotal = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.MRP_SS) || 0;
    return sum + (price * item.Quantity);
  }, 0);
  
  const shipping: number = 0; // Simple free shipping, no extra delivery charges
  const tax = cartItems.reduce((sum, item) => {
    const gst = parseFloat(item.GST_SS) || 0;
    return sum + (gst * item.Quantity);
  }, 0);
  
  const discount = cartItems.reduce((sum, item) => {
    const itemPrice = parseFloat(item.MRP_SS) || 0;
    const itemDiscount = parseFloat(item.Discount) || 0;
    return sum + ((itemPrice * itemDiscount / 100) * item.Quantity);
  }, 0);
  
  const total = subtotal + tax - discount + shipping;

  const handleInputChange = (field: string, value: string) => {
    // No-op since we're not using the form inputs anymore
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate authentication first
    if (!validateCustomerAuth()) {
      router.push('/auth/signin')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Authentication token not found')
      }
      
      // Generate idempotency key for this order request
      const idempotencyKey = crypto.randomUUID();
      
      // Place the order by calling the backend API
      const response = await fetch(`${API}/order/place`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey
        },
      })
      
      if (response.ok) {
        // Order placed successfully
        const data = await response.json()
        console.log("Order placed:", data)
        
        // Store order data and recommendations in session storage with timestamp
        sessionStorage.setItem('orderConfirmationData', JSON.stringify({
          order: data.order,
          recommendations: data.recommendations,
          timestamp: Date.now() // Add timestamp for expiration check
        }));
        
        // Redirect to order confirmation page
        router.push('/order-confirmation')
      } else if (response.status === 409) {
        // Order is already being processed - fetch and display existing order
        const errorData = await response.json();
        console.log("Order already in progress:", errorData);
        
        // Even though there was a conflict, we can try to get the order details
        // The backend should have the order ready, so we can redirect to confirmation
        // Or handle this as needed based on response
        setError(errorData.message || 'Order is being processed, please wait.');
        // Optionally, we could poll for the order or redirect after a delay
        setTimeout(() => {
          router.push('/order-history');
        }, 2000);
      } else if (response.status === 401) {
        // Token expired or invalid
        performCustomerLogout('/auth/signin')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to place order')
      }
    } catch (err) {
      console.error("Order placement error:", err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-xl">Loading checkout...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Your order will be delivered to your registered address:</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium">{customerDetails.address || "Address not provided"}</p>
                    {customerDetails.locality && <p>{customerDetails.locality}</p>}
                    {customerDetails.district && <p>{customerDetails.district}</p>}
                    {customerDetails.state && <p>{customerDetails.state}</p>}
                    {customerDetails.country && <p>{customerDetails.country}</p>}
                    {customerDetails.continent && <p>{customerDetails.continent}</p>}
                    
                    {/* Show message when locality information is missing */}
                    {customerDetails.hasLocalityId && !customerDetails.locality && (
                      <p className="text-sm text-yellow-600 mt-2">
                        ⚠️ Your locality information is missing. Please contact support to update your address details.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method - simplified to Cash on Delivery only */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Cash on Delivery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Payments are accepted only via <span className="font-semibold">Cash on Delivery (COD)</span>. 
                  You will pay the total amount in cash when your order is delivered.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.VendorProductId} className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.ProductName}</h4>
                        <p className="text-sm text-muted-foreground">Qty: {item.Quantity}</p>
                        <p className="text-sm text-muted-foreground">Vendor: {item.VendorName}</p>
                      </div>
                      <span className="font-medium">₹{(parseFloat(item.MRP_SS) * item.Quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Price Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>GST</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? "FREE" : `₹${shipping.toFixed(2)}`}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>

                {/* Security Info */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                  <Shield className="h-4 w-4" />
                  <span>Your payment information is secure</span>
                </div>

                {/* Place Order Button */}
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading || cartItems.length === 0}
                >
                  {isLoading ? "Processing..." : "Place Order"}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By placing your order, you agree to our Terms of Service and Privacy Policy
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}