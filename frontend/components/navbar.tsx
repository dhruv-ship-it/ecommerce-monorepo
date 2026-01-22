"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Search, ShoppingCart, User, Menu, Heart, Package, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { useState as useReactState } from 'react';
import { validateCustomerAuth, performCustomerLogout, getCustomerFromToken } from '../utils/auth';

export function Navbar() {
  const API = process.env.NEXT_PUBLIC_API_URL;
  
  const [cartItemCount, setCartItemCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  // Removed modal states since we're using separate pages now
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    // Validate customer authentication on component mount
    const isAuthenticated = validateCustomerAuth();
    setIsLoggedIn(isAuthenticated);
    
    if (isAuthenticated) {
      // Get customer info from token
      const customerData = getCustomerFromToken();
      setCustomer(customerData);
      
      // Fetch cart count for logged-in customer
      const token = localStorage.getItem('token');
      if (token) {
        fetchCartCount(token);
      }
    } else {
      setCustomer(null);
      setCartItemCount(0);
    }
    
    // Fetch categories
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch(`${API}/products/categories/all`);
      const data = await res.json();
      
      // Check for backend errors first
      if (!res.ok || data.error) {
        console.error('Backend error:', data.error || 'Server error');
        setCategories([]);
        return;
      }
      
      // Check if categories exist and is an array
      if (data.categories && Array.isArray(data.categories)) {
        setCategories(data.categories);
      } else {
        console.error('Invalid categories data structure:', data);
        setCategories([]);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]);
    }
  }

  async function fetchCartCount(token: string) {
    // Validate auth before making request
    if (!validateCustomerAuth()) {
      performCustomerLogout('/');
      return;
    }
    
    try {
      const res = await fetch(`${API}/cart/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setCartItemCount(data.count);
      } else if (res.status === 401) {
        // Token expired or invalid
        performCustomerLogout('/');
      } else {
        setCartItemCount(0);
      }
    } catch {
      setCartItemCount(0);
    }
  }

  function handleLogout() {
    performCustomerLogout('/');
  }

  // Removed modal form states and handlers since we're using separate pages now

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <div className="flex flex-col space-y-4 mt-4">
                <Link href="/models" className="text-lg font-medium">
                  All Products
                </Link>
                {Array.isArray(categories) && categories.map((category) => (
                  <Link 
                    key={category.ProductCategoryId} 
                    href={`/models?categoryId=${category.ProductCategoryId}`} 
                    className="text-lg font-medium"
                  >
                    {category.ProductCategory}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShoppingBag className="text-white h-5 w-5" />
            </div>
            <span className="font-bold text-xl hidden sm:inline-block">Smart Kart</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/models" className="text-sm font-medium hover:text-blue-600">
              All Products
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="text-sm font-medium hover:text-blue-600">Categories</DropdownMenuTrigger>
              <DropdownMenuContent>
                {Array.isArray(categories) && categories.map((category) => (
                  <DropdownMenuItem key={category.ProductCategoryId} asChild>
                    <Link href={`/models?categoryId=${category.ProductCategoryId}`}>
                      {category.ProductCategory}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2">
            {/* User Account */}
            {isLoggedIn && customer ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <div>
                      <div className="font-bold">{customer.email}</div>
                      <div className="text-xs text-muted-foreground">{customer.role}</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/order-history">Order History</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>Log Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center space-x-2">
                <Link href="/signin">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
            {/* Mobile Auth - Removed since we're using separate pages now */}
            {/* Cart */}
            {isLoggedIn && (
              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0"
                    >
                      {cartItemCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
      {/* Removed all modal dialogs since we're using separate pages now */}
    </header>
  )
}
