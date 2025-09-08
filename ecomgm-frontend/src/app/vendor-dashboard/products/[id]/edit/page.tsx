"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { validateAuth, performAutoLogout, getValidToken } from "@/utils/auth";

interface Product {
  VendorProductId: number;
  ProductId: number;
  Product: string;
  MRP_SS: number;
  Discount: number;
  GST_SS: number;
  StockQty: number;
  IsNotAvailable: string;
  DefaultCourier: number;
  CourierName?: string;
  CourierMobile?: string;
}

interface Courier {
  UserId: number;
  User: string;
  UserMobile: string;
  UserEmail: string;
}

export default function EditVendorProduct({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<number | null>(null);
  const [stockQty, setStockQty] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [gst, setGst] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);

  useEffect(() => {
    // Handle both Promise and resolved params
    if (params instanceof Promise) {
      params.then(resolved => {
        setResolvedParams(resolved);
      });
    } else {
      setResolvedParams(params);
    }
  }, [params]);

  useEffect(() => {
    if (!resolvedParams) return;

    // Validate authentication on page load
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    const fetchData = async () => {
      try {
        const validToken = getValidToken();
        if (!validToken) {
          performAutoLogout("/");
          return;
        }
        
        // Fetch product details
        const productResponse = await fetch(`http://localhost:4000/vendor/products?id=${resolvedParams.id}`, {
          headers: {
            Authorization: `Bearer ${validToken.token}`,
          },
        });
        
        if (productResponse.ok) {
          const productsData = await productResponse.json();
          const products = Array.isArray(productsData.products) ? productsData.products : [];
          
          if (products.length > 0) {
            const productToEdit = products[0]; // Since we're fetching by ID, there should only be one product
            setProduct(productToEdit);
            setSelectedCourier(Number(productToEdit.DefaultCourier) || null);
            setStockQty(Number(productToEdit.StockQty) || 0);
            setSellingPrice(Number(productToEdit.MRP_SS) || 0);
            setDiscount(Number(productToEdit.Discount) || 0);
            setGst(Number(productToEdit.GST_SS) || 0);
          } else {
            setError("Product not found");
          }
        } else if (productResponse.status === 401) {
          performAutoLogout("/");
          return;
        }
        
        // Fetch available couriers
        const couriersResponse = await fetch("http://localhost:4000/vendor/couriers", {
          headers: {
            Authorization: `Bearer ${validToken.token}`,
          },
        });
        
        if (couriersResponse.ok) {
          const couriersData = await couriersResponse.json();
          setCouriers(Array.isArray(couriersData.couriers) ? couriersData.couriers : []);
        } else if (couriersResponse.status === 401) {
          performAutoLogout("/");
          return;
        }
      } catch (error: any) {
        console.error("Error fetching data:", error);
        setError("Failed to load data: " + (error?.message || "Unknown error"));
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [resolvedParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resolvedParams) return;
    
    if (selectedCourier === null) {
      setError("Please select a courier");
      return;
    }
    
    if (stockQty < 0) {
      setError("Please enter a valid stock quantity (0 or greater)");
      return;
    }
    
    if (sellingPrice <= 0) {
      setError("Please enter a valid selling price (greater than 0)");
      return;
    }
    
    if (discount < 0 || discount > 100) {
      setError("Please enter a valid discount percentage (0-100)");
      return;
    }
    
    if (gst < 0 || gst > 100) {
      setError("Please enter a valid GST percentage (0-100)");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }
      
      const response = await fetch(`http://localhost:4000/vendor/product/${resolvedParams.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken.token}`,
        },
        body: JSON.stringify({
          defaultCourierId: selectedCourier,
          stockQty,
          sellingPrice,
          discount,
          gst,
        }),
      });
      
      if (response.ok) {
        alert("Product updated successfully");
        router.push("/vendor-dashboard/products?success=" + encodeURIComponent("Product updated successfully"));
      } else if (response.status === 401) {
        performAutoLogout("/");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update product");
      }
    } catch (error: any) {
      console.error("Error updating product:", error);
      setError("Failed to update product. Please check your network connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xl">Loading product...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  EcomGM - Vendor Dashboard
                </h1>
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => router.push("/vendor-dashboard/products")}
                  className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Back to Products
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
                  <p className="mt-1 text-sm text-gray-500">{error}</p>
                  <div className="mt-6">
                    <button
                      onClick={() => router.push("/vendor-dashboard/products")}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Back to Products
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  EcomGM - Vendor Dashboard
                </h1>
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => router.push("/vendor-dashboard/products")}
                  className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Back to Products
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Product not found</h3>
                  <p className="mt-1 text-sm text-gray-500">The product you're looking for doesn't exist or has been removed.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => router.push("/vendor-dashboard/products")}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Back to Products
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                EcomGM - Vendor Dashboard
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/vendor-dashboard/products")}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Back to Products
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                Edit Product: {product.Product}
              </h3>
              
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Courier
                  </label>
                  <select
                    value={selectedCourier || ""}
                    onChange={(e) => setSelectedCourier(Number(e.target.value))}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  >
                    <option value="">Choose a courier</option>
                    {couriers.map((courier) => (
                      <option key={courier.UserId} value={courier.UserId}>
                        {courier.User} ({courier.UserEmail} - {courier.UserMobile})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      value={stockQty}
                      onChange={(e) => setStockQty(Number(e.target.value) || 0)}
                      min="0"
                      placeholder="Enter quantity"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Selling Price (₹)
                    </label>
                    <input
                      type="number"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
                      min="1"
                      step="0.01"
                      placeholder="Enter selling price"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                      min="0"
                      max="100"
                      placeholder="Enter discount percentage"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GST (%)
                    </label>
                    <input
                      type="number"
                      value={gst}
                      onChange={(e) => setGst(Number(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="Enter GST percentage"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                  </div>
                </div>
                
                {/* Price calculation preview */}
                {(Number(sellingPrice) > 0 || Number(discount) > 0 || Number(gst) > 0) && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Price Calculation Preview</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Selling Price:</span>
                        <span>₹{Number(sellingPrice).toFixed(2)}</span>
                      </div>
                      {Number(discount) > 0 && (
                        <div className="flex justify-between">
                          <span>Discount ({discount}%):</span>
                          <span>-₹{(Number(sellingPrice) * Number(discount) / 100).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Price after discount:</span>
                        <span>₹{(Number(sellingPrice) - (Number(sellingPrice) * Number(discount) / 100)).toFixed(2)}</span>
                      </div>
                      {Number(gst) > 0 && (
                        <div className="flex justify-between">
                          <span>GST ({gst}%):</span>
                          <span>+₹{((Number(sellingPrice) - (Number(sellingPrice) * Number(discount) / 100)) * Number(gst) / 100).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium pt-2 border-t">
                        <span>Final Price:</span>
                        <span>₹{(
                          (Number(sellingPrice) - (Number(sellingPrice) * Number(discount) / 100)) + 
                          ((Number(sellingPrice) - (Number(sellingPrice) * Number(discount) / 100)) * Number(gst) / 100)
                        ).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => router.push("/vendor-dashboard/products")}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  >
                    {submitting && (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {submitting ? "Updating..." : "Update Product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}