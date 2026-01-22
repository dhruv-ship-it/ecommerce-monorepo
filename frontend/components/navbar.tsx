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
  const [openSignIn, setOpenSignIn] = useState(false);
  const [openSignUp, setOpenSignUp] = useState(false);
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

  // Sign In form state
  const signInForm = useForm({ defaultValues: { email: '', password: '' } });
  const [signInError, setSignInError] = useReactState('');
  const [signInLoading, setSignInLoading] = useReactState(false);

  // Sign Up form state
  const signUpForm = useForm({ defaultValues: { name: '', gender: '', mobile: '', email: '', password: '', address: '', dob: '', pin: '' } });
  const [signUpError, setSignUpError] = useReactState('');
  const [signUpSuccess, setSignUpSuccess] = useReactState('');
  const [signUpLoading, setSignUpLoading] = useReactState(false);

  async function handleSignIn(data: any) {
    setSignInLoading(true);
    setSignInError('');
    try {
      // Remove any SU token before customer login
      localStorage.removeItem('su_token');
      localStorage.removeItem('admin_token');
      const res = await fetch(`${API}/api/auth/customer-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      setSignInLoading(false);
      if (!res.ok) {
        setSignInError(json.error || 'Invalid email or password');
      } else {
        localStorage.setItem('token', json.token);
        setOpenSignIn(false);
        signInForm.reset();
        // Optionally, reload or update UI to reflect logged-in state
        window.location.reload();
      }
    } catch (err: any) {
      setSignInLoading(false);
      setSignInError('Login failed');
    }
  }

  async function handleSignUp(data: any) {
    setSignUpLoading(true);
    setSignUpError('');
    setSignUpSuccess('');
    try {
      const res = await fetch(`${API}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          gender: data.gender,
          mobile: data.mobile,
          email: data.email,
          password: data.password,
          address: data.address,
          dob: data.dob,
          pin: data.pin,
        }),
      });
      const json = await res.json();
      setSignUpLoading(false);
      if (!res.ok) {
        setSignUpError(json.error || 'Sign up failed');
      } else {
        setSignUpSuccess('Account created! You can now sign in.');
        setTimeout(() => {
          setOpenSignUp(false);
          setSignUpSuccess('');
          signUpForm.reset();
          setOpenSignIn(true);
        }, 1200);
      }
    } catch (err: any) {
      setSignUpLoading(false);
      setSignUpError('Sign up failed');
    }
  }

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
                <Button variant="ghost" size="sm" onClick={() => setOpenSignIn(true)}>
                  Sign In
                </Button>
                <Button size="sm" onClick={() => setOpenSignUp(true)}>
                  Sign Up
                </Button>
              </div>
            )}
            {/* Mobile Auth */}
            {!isLoggedIn && (
              <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setOpenSignIn(true)}>
                <User className="h-5 w-5" />
              </Button>
            )}
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
      {/* Sign In Dialog */}
      <Dialog open={openSignIn} onOpenChange={setOpenSignIn}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign In</DialogTitle>
          </DialogHeader>
          {signInError && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{signInError}</AlertDescription>
            </Alert>
          )}
          <Form {...signInForm}>
            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
              <FormField
                control={signInForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signInForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Password" {...field} required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={signInLoading}>
                {signInLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {/* Sign Up Dialog */}
      <Dialog open={openSignUp} onOpenChange={setOpenSignUp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Up</DialogTitle>
          </DialogHeader>
          {signUpError && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{signUpError}</AlertDescription>
            </Alert>
          )}
          {signUpSuccess && (
            <Alert>
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{signUpSuccess}</AlertDescription>
            </Alert>
          )}
          <Form {...signUpForm}>
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
              <FormField
                control={signUpForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signUpForm.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                      <select {...field} required className="w-full border rounded p-2">
                        <option value="">Select Gender</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signUpForm.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Mobile Number" {...field} required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signUpForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signUpForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Password" {...field} required minLength={6} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signUpForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Address" {...field} required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signUpForm.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signUpForm.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIN</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="Enter a PIN (e.g. 1234)" {...field} required minLength={4} maxLength={10} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={signUpLoading}>
                {signUpLoading ? 'Signing Up...' : 'Sign Up'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </header>
  )
}
