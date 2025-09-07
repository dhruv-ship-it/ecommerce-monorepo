"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { validateCustomerAuth, performCustomerLogout } from "../../utils/auth"

const API = process.env.NEXT_PUBLIC_API_URL;

export default function CartPage() {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const isAuthenticated = validateCustomerAuth();
    setIsLoggedIn(isAuthenticated);
  }, []);

  useEffect(() => {
    async function fetchCart() {
      setLoading(true);
      
      // Validate authentication
      if (!validateCustomerAuth()) {
        setCartItems([]);
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        setCartItems([]);
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`${API}/cart`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.cart)) {
          setCartItems(data.cart);
        } else if (res.status === 401) {
          // Token expired or invalid
          performCustomerLogout('/');
          return;
        } else {
          setCartItems([]);
        }
      } catch (error) {
        console.error('Cart fetch error:', error);
        setCartItems([]);
      }
      setLoading(false);
    }
    fetchCart();
  }, []);

  const updateQuantity = async (vendorProductId: number, newQuantity: number) => {
    if (newQuantity === 0) {
      removeItem(vendorProductId);
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const res = await fetch(`${API}/cart/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ vendorProductId, quantity: newQuantity })
      });
      
      if (res.ok) {
        setCartItems((items) => 
          items.map((item) => 
            item.VendorProductId === vendorProductId 
              ? { ...item, Quantity: newQuantity } 
              : item
          )
        );
      } else {
        alert('Failed to update quantity');
      }
    } catch (error) {
      console.error('Update quantity error:', error);
      alert('Failed to update quantity');
    }
  };

  const removeItem = async (vendorProductId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const res = await fetch(`${API}/cart/remove`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ vendorProductId })
      });
      
      if (res.ok) {
        setCartItems((items) => items.filter((item) => item.VendorProductId !== vendorProductId));
      } else {
        alert('Failed to remove item');
      }
    } catch (error) {
      console.error('Remove item error:', error);
      alert('Failed to remove item');
    }
  };

  // Calculate totals based on vendor product pricing
  const subtotal = cartItems.reduce((sum, item) => {
    const itemPrice = Number(item.MRP_SS) || 0;
    return sum + (itemPrice * Number(item.Quantity));
  }, 0);
  
  const gstTotal = cartItems.reduce((sum, item) => {
    const gst = Number(item.GST_SS) || 0;
    return sum + (gst * Number(item.Quantity));
  }, 0);
  
  const discountTotal = cartItems.reduce((sum, item) => {
    const discount = Number(item.Discount) || 0;
    const itemPrice = Number(item.MRP_SS) || 0;
    return sum + ((itemPrice * discount / 100) * Number(item.Quantity));
  }, 0);
  
  const shipping = subtotal > 1000 ? 0 : 99; // Free shipping above ₹1000
  const total = subtotal + gstTotal - discountTotal + shipping;
  
  if (!isLoggedIn) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBag className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Please login to view your cart</h1>
        <p className="text-muted-foreground mb-6">You need to be logged in to manage your shopping cart</p>
        <Link href="/auth/signin">
          <Button>Login Now</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-xl">Loading your cart...</div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBag className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-6">Add some items to get started</p>
        <Link href="/models">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => (
            <Card key={item.VendorProductId}>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{item.ProductName}</h3>
                        <p className="text-sm text-muted-foreground mb-1">Model: {item.ModelName}</p>
                        <div className="text-sm text-muted-foreground mb-2">
                          <span>Color: {item.ColorName || 'N/A'}</span>
                          <span className="mx-2">•</span>
                          <span>Size: {item.SizeName || 'One Size'}</span>
                        </div>
                        <div className="text-sm text-blue-600 mb-2">
                          <span>Vendor: {item.VendorName}</span>
                          <span className="mx-2">•</span>
                          <span>Courier: {item.CourierName}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">₹{Number(item.MRP_SS).toLocaleString()}</div>
                        {item.Discount > 0 && (
                          <div className="text-sm text-green-600">-{item.Discount}% off</div>
                        )}
                        <div className="text-sm text-gray-500">+₹{Number(item.GST_SS)} GST</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => updateQuantity(item.VendorProductId, Number(item.Quantity) - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="px-4 py-2 border rounded-md min-w-[60px] text-center">{item.Quantity}</span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => updateQuantity(item.VendorProductId, Number(item.Quantity) + 1)}
                          disabled={Number(item.Quantity) >= Number(item.StockQty)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-gray-500 ml-2">({item.StockQty} available)</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.VendorProductId)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal ({cartItems.reduce((sum, item) => sum + Number(item.Quantity), 0)} items)</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>

              {discountTotal > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-₹{discountTotal.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>GST</span>
                <span>₹{gstTotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{shipping === 0 ? "FREE" : `₹${shipping}`}</span>
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>₹{total.toLocaleString()}</span>
              </div>

              {shipping > 0 && (
                <p className="text-sm text-muted-foreground">
                  Add ₹{(1000 - subtotal).toLocaleString()} more for free shipping
                </p>
              )}

              <Link href="/checkout">
                <Button className="w-full" size="lg">
                  Proceed to Checkout
                </Button>
              </Link>

              <Link href="/models">
                <Button variant="outline" className="w-full bg-transparent">
                  Continue Shopping
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
