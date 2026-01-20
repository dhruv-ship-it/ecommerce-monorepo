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
  const [loading, setLoading] = useState(true);
  const [shippingAddress, setShippingAddress] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    locality: "",
    district: "",
    state: "",
    country: "",
    zipCode: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Fetch cart items on component mount
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
      } finally {
        setLoading(false)
      }
    }
    
    fetchCart()
  }, [])

  const subtotal = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.MRP_SS) || 0;
    return sum + (price * item.Quantity);
  }, 0);
  
  const shipping = 0; // Simple free shipping, no extra delivery charges
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
    setShippingAddress((prev) => ({
      ...prev,
      [field]: value,
    }))
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
      
      // Place the order by calling the backend API
      const response = await fetch(`${API}/order/place`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      })
      
      if (response.ok) {
        // Order placed successfully
        const data = await response.json()
        console.log("Order placed:", data)
        
        // Redirect to order confirmation page or order history
        router.push('/order-confirmation')
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
            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={shippingAddress.fullName}
                      onChange={(e) => handleInputChange("fullName", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={shippingAddress.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={shippingAddress.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="address">Street Address *</Label>
                  <Textarea
                    id="address"
                    value={shippingAddress.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="locality">Locality/Area *</Label>
                    <Input
                      id="locality"
                      value={shippingAddress.locality}
                      onChange={(e) => handleInputChange("locality", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="district">District *</Label>
                    <Input
                      id="district"
                      value={shippingAddress.district}
                      onChange={(e) => handleInputChange("district", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="zipCode">ZIP/Postal Code *</Label>
                  <Input
                    id="zipCode"
                    value={shippingAddress.zipCode}
                    onChange={(e) => handleInputChange("zipCode", e.target.value)}
                    required
                  />
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