"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateAuth, performAutoLogout, getValidToken } from "@/utils/auth";

interface Product {
  VendorProductId: number;
  ProductId: number;
  Product: string;
  Description: string;
  Price: number;
  StockQty: number;
  IsNotAvailable: string;
  MRP_SS: number;
  Discount: number;
  GST_SS: number;
  CourierName?: string;
  CourierMobile?: string;
}

export default function VendorProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Validate authentication on page load
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    // Check for success message in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    if (success) {
      setSuccessMessage(decodeURIComponent(success));
      // Remove the success parameter from URL
      window.history.replaceState({}, document.title, "/vendor-dashboard/products");
    }
    
    const fetchProducts = async () => {
      try {
        const validToken = getValidToken();
        if (!validToken) {
          performAutoLogout("/");
          return;
        }
        
        const response = await fetch("http://localhost:4000/vendor/products", {
          headers: {
            Authorization: `Bearer ${validToken.token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Vendor products response data:', data);
          // Ensure data.products is an array before using it
          setProducts(Array.isArray(data.products) ? data.products : []);
        } else if (response.status === 401) {
          performAutoLogout("/");
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Failed to fetch products");
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("Failed to fetch products. Please check your network connection and try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [router]);

  // Clear success message after a delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleAddProduct = () => {
    router.push('/vendor-dashboard/products/new');
  };

  const handleEditProduct = (vendorProductId: number) => {
    router.push(`/vendor-dashboard/products/${vendorProductId}/edit`);
  };

  const handleDeleteProduct = (vendorProductId: number, productName: string) => {
    if (window.confirm(`Are you sure you want to remove "${productName}" from your catalog?`)) {
      deleteProduct(vendorProductId);
    }
  };

  const deleteProduct = async (vendorProductId: number) => {
    try {
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }
      
      const response = await fetch(`http://localhost:4000/vendor/product/${vendorProductId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${validToken.token}`,
        },
      });
      
      if (response.ok) {
        // Remove the product from the state
        setProducts(products.filter(product => product.VendorProductId !== vendorProductId));
        setSuccessMessage("Product removed from your catalog successfully");
      } else if (response.status === 401) {
        performAutoLogout("/");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to remove product");
      }
    } catch (error) {
      console.error("Error removing product:", error);
      setError("Failed to remove product. Please check your network connection and try again.");
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
          <span className="text-xl">Loading your products...</span>
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
                onClick={() => router.push("/vendor-dashboard")}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  My Products
                </h3>
                <button
                  onClick={handleAddProduct}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Add New Product
                </button>
              </div>
              
              {Array.isArray(products) && products.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding a new product to your catalog.</p>
                  <div className="mt-6">
                    <button
                      onClick={handleAddProduct}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Product
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Courier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.isArray(products) && products.map((product) => (
                        <tr key={product.ProductId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {product.Product}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>MRP: ₹{product.MRP_SS || 0}</div>
                            <div>Discount: {product.Discount || 0}%</div>
                            <div>GST: {product.GST_SS || 0}%</div>
                            <div className="font-medium pt-1 border-t">
                              Final: ₹{(
                                ((product.MRP_SS || 0) - ((product.MRP_SS || 0) * (product.Discount || 0) / 100)) + 
                                (((product.MRP_SS || 0) - ((product.MRP_SS || 0) * (product.Discount || 0) / 100)) * (product.GST_SS || 0) / 100)
                              ).toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.StockQty}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.CourierName ? (
                              <div>
                                <div>{product.CourierName}</div>
                                <div className="text-xs text-gray-400">{product.CourierMobile}</div>
                              </div>
                            ) : 'Not assigned'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full 
                                ${product.IsNotAvailable === 'Y' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'}`}
                            >
                              {product.IsNotAvailable === 'Y' ? 'Out of Stock' : 'In Stock'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditProduct(product.VendorProductId)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => router.push(`/vendor-dashboard/products/${product.ProductId}/orders`)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                View Orders
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.VendorProductId, product.Product)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}