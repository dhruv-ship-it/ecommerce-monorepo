"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ShoppingCart, Heart, Share2, Truck, Shield, RotateCcw, ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

interface Product {
  ProductId: number
  Product: string
  ProductCategory: string
  ProductSubCategory: string
  Model: string
  Brand: string
  Color: string
  Size: string
  Material: string
  Unit: string
  Currency: string
  MRP: number
  Quantity: number
  thumbnail: string
  mainImage: string
  galleryImages: string[]
  images: any[]
  variants: any[]
}

const API = process.env.NEXT_PUBLIC_API_URL

export default function ProductDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (productId) {
      fetchProduct()
    }
  }, [productId])

  async function fetchProduct() {
    try {
      setLoading(true)
      const response = await fetch(`${API}/products/${productId}`)
      const data = await response.json()
      
      if (response.ok) {
        setProduct(data.product)
        // Set initial selected variant as the current product
        setSelectedVariant(data.product)
      } else {
        setError(data.error || "Product not found")
      }
    } catch (error) {
      console.error('Error fetching product:', error)
      setError("Failed to load product")
    } finally {
      setLoading(false)
    }
  }

  const addToCart = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        window.location.href = '/signin'
        return
      }

      const response = await fetch(`${API}/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          productId: selectedVariant?.ProductId || product?.ProductId, 
          quantity 
        })
      })

      if (response.ok) {
        alert('Product added to cart!')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to add to cart')
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
      alert('Failed to add to cart')
    }
  }

  const handleVariantChange = (variant: any) => {
    setSelectedVariant(variant)
    router.push(`/products/${variant.ProductId}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/products">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const currentProduct = selectedVariant || product
  const displayImages = currentProduct.images || []
  const availableColors = [...new Set([product, ...product.variants].map(p => p.Color))]
  const availableSizes = [...new Set([product, ...product.variants].map(p => p.Size))]

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-blue-600">Products</Link>
          <span>/</span>
          <Link href={`/products?categoryId=${product.ProductCategory}`} className="hover:text-blue-600">
            {product.ProductCategory}
          </Link>
          <span>/</span>
          <span className="text-gray-900">{product.Product}</span>
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="aspect-square">
            <Image
              src={displayImages[selectedImage]?.ImagePath || currentProduct.mainImage || currentProduct.thumbnail || "/placeholder.svg"}
              alt={currentProduct.Product}
              width={500}
              height={500}
              className="w-full h-full object-cover rounded-lg border"
            />
          </div>
          {displayImages.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {displayImages.map((image: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 ${
                    selectedImage === index ? "border-blue-500" : "border-gray-200"
                  }`}
                >
                  <Image
                    src={image.ImagePath || "/placeholder.svg"}
                    alt={`${currentProduct.Product} ${index + 1}`}
                    width={100}
                    height={100}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{currentProduct.Product}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <span className="font-medium">{currentProduct.Brand}</span>
              <span>•</span>
              <span>{currentProduct.Model}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{currentProduct.ProductCategory}</Badge>
              <Badge variant="secondary">{currentProduct.ProductSubCategory}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-3xl font-bold text-blue-600">₹{currentProduct.MRP.toLocaleString()}</span>
            <Badge variant={currentProduct.Quantity > 0 ? "default" : "destructive"}>
              {currentProduct.Quantity > 0 ? `${currentProduct.Quantity} in stock` : "Out of stock"}
            </Badge>
          </div>

          {/* Product Details */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm text-gray-600">Color:</span>
              <p className="font-medium">{currentProduct.Color}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Size:</span>
              <p className="font-medium">{currentProduct.Size}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Material:</span>
              <p className="font-medium">{currentProduct.Material}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Unit:</span>
              <p className="font-medium">{currentProduct.Unit}</p>
            </div>
          </div>

          {/* Variants Selection */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-4">
              {/* Color Variants */}
              {availableColors.length > 1 && (
                <div>
                  <h3 className="font-semibold mb-3">Available Colors:</h3>
                  <div className="flex gap-2 flex-wrap">
                    {availableColors.map((color) => {
                      const variant = [product, ...product.variants].find(v => v.Color === color)
                      const isSelected = currentProduct.Color === color
                      return (
                        <button
                          key={color}
                          onClick={() => variant && handleVariantChange(variant)}
                          className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                            isSelected 
                              ? "border-blue-500 bg-blue-50 text-blue-600" 
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          {color}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Size Variants */}
              {availableSizes.length > 1 && (
                <div>
                  <h3 className="font-semibold mb-3">Available Sizes:</h3>
                  <div className="flex gap-2 flex-wrap">
                    {availableSizes.map((size) => {
                      const variant = [product, ...product.variants].find(v => v.Size === size)
                      const isSelected = currentProduct.Size === size
                      return (
                        <button
                          key={size}
                          onClick={() => variant && handleVariantChange(variant)}
                          className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                            isSelected 
                              ? "border-blue-500 bg-blue-50 text-blue-600" 
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          {size}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quantity */}
          <div>
            <h3 className="font-semibold mb-3">Quantity</h3>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                -
              </Button>
              <span className="px-4 py-2 border rounded-md min-w-[60px] text-center">{quantity}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setQuantity(Math.min(currentProduct.Quantity, quantity + 1))}
                disabled={quantity >= currentProduct.Quantity}
              >
                +
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={addToCart} 
              className="w-full" 
              size="lg"
              disabled={currentProduct.Quantity === 0}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {currentProduct.Quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <Heart className="mr-2 h-4 w-4" />
                Wishlist
              </Button>
              <Button variant="outline" className="flex-1">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-blue-600" />
              <span>Free Shipping</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-green-600" />
              <span>1 Year Warranty</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <RotateCcw className="h-4 w-4 text-orange-600" />
              <span>Easy Returns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Tabs */}
      <Tabs defaultValue="details" className="mt-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Product Details</TabsTrigger>
          <TabsTrigger value="specifications">Specifications</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Model: {product.Model}</h4>
                <p className="text-gray-600">Brand: {product.Brand}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Category</h4>
                <p className="text-gray-600">{product.ProductCategory} &#62; {product.ProductSubCategory}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Material & Specifications</h4>
                <p className="text-gray-600">Material: {product.Material}</p>
                <p className="text-gray-600">Available in {product.Color} color and {product.Size} size</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="specifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Technical Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Brand:</span>
                    <span>{product.Brand}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Model:</span>
                    <span>{product.Model}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Color:</span>
                    <span>{product.Color}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Size:</span>
                    <span>{product.Size}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Material:</span>
                    <span>{product.Material}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Unit:</span>
                    <span>{product.Unit}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Price:</span>
                    <span>₹{product.MRP.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Availability:</span>
                    <span>{product.Quantity > 0 ? 'In Stock' : 'Out of Stock'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reviews" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <p>No reviews yet for this product.</p>
                <p className="text-sm mt-2">Be the first to review this item!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Related Products */}
      {product.variants && product.variants.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Other Variants</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {product.variants.slice(0, 4).map((variant) => (
              <Card key={variant.ProductId} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square relative">
                  <Image
                    src={variant.thumbnail || "/placeholder.svg"}
                    alt={variant.Product}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2">{variant.Product}</h3>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>{variant.Color}</span>
                    <span>{variant.Size}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-600">₹{variant.MRP.toLocaleString()}</span>
                    <Link href={`/products/${variant.ProductId}`}>
                      <Button size="sm" variant="outline">View</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}