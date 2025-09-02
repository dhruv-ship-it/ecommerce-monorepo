"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShoppingCart, Heart, Star, Package, Shield, Recycle, Droplets, Flame } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"

interface Model {
  ModelId: number
  Model: string
  Brand: number
  BrandName: string
  MaterialName: string
  Dimensions: string
  Weight: string
  IsWaterResistant: string
  IsFireProof: string
  IsEcoFriendly: string
  IsRecyclable: string
  IsHazaordous: string
  IsFlamable: string
  Warranty: string
  Guarantee: string
  SpecsJSON: string
  OtherSpecs: string
  products: Product[]
  availableColors: ColorOption[]
  availableSizes: SizeOption[]
}

interface Product {
  ProductId: number
  Product: string
  ColorName: string
  SizeName: string
  MRP: number
  Quantity: number
  Color: number
  Size: number
  thumbnail: string
  mainImage: string
  images: any[]
  galleryImages: string[]
}

interface ColorOption {
  ColorId: number
  Color: string
}

interface SizeOption {
  SizeId: number
  Size: string
}

interface VendorInfo {
  VendorProductId: number
  VendorName: string
  VendorEmail: string
  VendorPhone: string
  CourierName: string
  MRP_SS: number
  Discount: number
  GST_SS: number
  StockQty: number
}

const API = process.env.NEXT_PUBLIC_API_URL

export default function ModelDetailPage() {
  const params = useParams()
  const modelId = params.id as string

  const [model, setModel] = useState<Model | null>(null)
  const [selectedColor, setSelectedColor] = useState<number | null>(null)
  const [selectedSize, setSelectedSize] = useState<number | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [vendors, setVendors] = useState<VendorInfo[]>([])
  const [totalStock, setTotalStock] = useState(0)
  const [loading, setLoading] = useState(true)
  const [productLoading, setProductLoading] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  useEffect(() => {
    fetchModelDetails()
  }, [modelId])

  useEffect(() => {
    if (selectedColor && selectedSize) {
      fetchSpecificProduct()
    } else if (selectedColor && selectedSize === 0) {
      // Handle products with no size (like watches, belts)
      fetchSpecificProduct()
    } else {
      setSelectedProduct(null)
      setVendors([])
    }
  }, [selectedColor, selectedSize])

  useEffect(() => {
    if (selectedProduct) {
      fetchVendorPricing()
    }
  }, [selectedProduct])

  async function fetchModelDetails() {
    try {
      setLoading(true)
      const response = await fetch(`${API}/models/${modelId}`)
      const data = await response.json()
      
      if (response.ok) {
        setModel(data.model)
        
        // Set default selections if available
        if (data.model.availableColors.length > 0) {
          setSelectedColor(data.model.availableColors[0].ColorId)
        }
        if (data.model.availableSizes.length > 0) {
          // Check if there's a size with value 0 (no size applicable)
          const noSizeOption = data.model.availableSizes.find(size => size.SizeId === 0)
          if (noSizeOption) {
            setSelectedSize(0) // Auto-select "no size" for products like watches
          } else {
            setSelectedSize(data.model.availableSizes[0].SizeId)
          }
        }
      } else {
        console.error('Failed to fetch model details:', data.error)
      }
    } catch (error) {
      console.error('Error fetching model details:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchSpecificProduct() {
    if (!selectedColor || (selectedSize === null && selectedSize !== 0)) return
    
    try {
      setProductLoading(true)
      const response = await fetch(`${API}/models/${modelId}/product/${selectedColor}/${selectedSize}`)
      const data = await response.json()
      
      if (response.ok) {
        setSelectedProduct(data.product)
        setSelectedImageIndex(0)
      } else {
        setSelectedProduct(null)
        console.log('Product not available for this color/size combination')
      }
    } catch (error) {
      console.error('Error fetching specific product:', error)
      setSelectedProduct(null)
    } finally {
      setProductLoading(false)
    }
  }

  async function fetchVendorPricing() {
    if (!selectedProduct) return
    
    try {
      const response = await fetch(`${API}/models/${modelId}/products/${selectedProduct.ProductId}/vendors`)
      const data = await response.json()
      
      if (response.ok) {
        setVendors(data.vendors || [])
        setTotalStock(data.totalStock || 0)
      } else {
        console.error('Failed to fetch vendor pricing:', data.error)
        setVendors([])
        setTotalStock(0)
      }
    } catch (error) {
      console.error('Error fetching vendor pricing:', error)
      setVendors([])
      setTotalStock(0)
    }
  }

  const getFeatureBadges = () => {
    if (!model) return []
    
    const badges = []
    if (model.IsWaterResistant === 'Y') badges.push({ icon: Droplets, text: 'Water Resistant', color: 'bg-blue-100 text-blue-800' })
    if (model.IsFireProof === 'Y') badges.push({ icon: Flame, text: 'Fire Proof', color: 'bg-red-100 text-red-800' })
    if (model.IsEcoFriendly === 'Y') badges.push({ icon: Recycle, text: 'Eco Friendly', color: 'bg-green-100 text-green-800' })
    if (model.IsRecyclable === 'Y') badges.push({ icon: Recycle, text: 'Recyclable', color: 'bg-green-100 text-green-800' })
    
    return badges
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading model details...</div>
      </div>
    )
  }

  if (!model) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-600 mb-4">Model not found</h1>
          <Link href="/products">
            <Button>Back to Models</Button>
          </Link>
        </div>
      </div>
    )
  }

  const currentImages = selectedProduct ? [
    selectedProduct.mainImage,
    ...selectedProduct.galleryImages
  ].filter(Boolean) : []

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center space-x-2 text-sm text-gray-500">
          <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
          <li>/</li>
          <li><Link href="/products" className="hover:text-blue-600">Models</Link></li>
          <li>/</li>
          <li className="text-gray-900">{model.Model}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Image Gallery */}
        <div>
          {selectedProduct && currentImages.length > 0 ? (
            <div>
              <div className="aspect-square relative mb-4 rounded-lg overflow-hidden">
                <Image
                  src={`${API}${currentImages[selectedImageIndex]}`}
                  alt={selectedProduct.Product}
                  fill
                  className="object-cover"
                />
              </div>
              {currentImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {currentImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`aspect-square relative rounded-lg overflow-hidden border-2 ${
                        selectedImageIndex === index ? 'border-blue-600' : 'border-gray-200'
                      }`}
                    >
                      <Image
                        src={`${API}${image}`}
                        alt={`View ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
              <Package className="h-16 w-16 text-gray-400" />
              <p className="text-gray-500 ml-2">Select color and size to view images</p>
            </div>
          )}
        </div>

        {/* Model Information */}
        <div>
          <div className="mb-4">
            <Badge variant="outline" className="mb-2">{model.BrandName}</Badge>
            <h1 className="text-3xl font-bold mb-2">{model.Model}</h1>
            <p className="text-gray-600 mb-4">Material: {model.MaterialName}</p>
            
            {/* Feature Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {getFeatureBadges().map((badge, index) => {
                const Icon = badge.icon
                return (
                  <div key={index} className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${badge.color}`}>
                    <Icon className="h-4 w-4" />
                    {badge.text}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Available Colors</h3>
            <div className="grid grid-cols-3 gap-2">
              {model.availableColors.map((color) => (
                <button
                  key={color.ColorId}
                  onClick={() => setSelectedColor(color.ColorId)}
                  className={`p-3 border rounded-lg text-center ${
                    selectedColor === color.ColorId 
                      ? 'border-blue-600 bg-blue-50 text-blue-800' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {color.Color}
                </button>
              ))}
            </div>
          </div>

          {/* Size Selection */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Available Sizes</h3>
            <div className="grid grid-cols-4 gap-2">
              {model.availableSizes.map((size) => (
                <button
                  key={size.SizeId}
                  onClick={() => setSelectedSize(size.SizeId)}
                  className={`p-3 border rounded-lg text-center ${
                    selectedSize === size.SizeId 
                      ? 'border-blue-600 bg-blue-50 text-blue-800' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {size.SizeId === 0 ? 'One Size' : size.Size}
                </button>
              ))}
            </div>
          </div>

          {/* Product Information */}
          {productLoading ? (
            <div className="text-center py-4">Loading product details...</div>
          ) : selectedProduct ? (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-blue-600">₹{selectedProduct.MRP.toLocaleString()}</h3>
                  <p className="text-gray-600">
                    {selectedProduct.ColorName} • {selectedProduct.SizeName}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">In Stock</div>
                  <div className="font-semibold">{totalStock} units available</div>
                </div>
              </div>
              
              <Button size="lg" className="w-full">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart
              </Button>
            </div>
          ) : selectedColor && selectedSize ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600 mb-2">Product doesn't exist for this color/size combination</p>
              <p className="text-sm text-gray-500">Please try a different combination</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Vendor Pricing */}
      {vendors.length > 0 && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4">Available from {vendors.length} vendor{vendors.length > 1 ? 's' : ''}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.map((vendor) => (
                <div key={vendor.VendorProductId} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{vendor.VendorName}</h4>
                      <p className="text-sm text-gray-600">{vendor.CourierName}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">₹{vendor.MRP_SS.toLocaleString()}</div>
                      {vendor.Discount > 0 && (
                        <div className="text-sm text-green-600">-{vendor.Discount}% off</div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{vendor.StockQty} in stock</span>
                    <span>+₹{vendor.GST_SS} GST</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model Specifications */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-bold mb-4">Specifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Basic Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Brand:</span>
                  <span>{model.BrandName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Material:</span>
                  <span>{model.MaterialName}</span>
                </div>
                {model.Dimensions && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dimensions:</span>
                    <span>{model.Dimensions}</span>
                  </div>
                )}
                {model.Weight && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Weight:</span>
                    <span>{model.Weight}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Warranty:</span>
                  <span>{model.Warranty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Guarantee:</span>
                  <span>{model.Guarantee}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Features</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Water Resistant:</span>
                  <span>{model.IsWaterResistant === 'Y' ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fire Proof:</span>
                  <span>{model.IsFireProof === 'Y' ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Eco Friendly:</span>
                  <span>{model.IsEcoFriendly === 'Y' ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recyclable:</span>
                  <span>{model.IsRecyclable === 'Y' ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hazardous:</span>
                  <span>{model.IsHazaordous === 'Y' ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Flammable:</span>
                  <span>{model.IsFlamable === 'Y' ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>
          
          {model.OtherSpecs && model.OtherSpecs.trim() !== '' && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Additional Specifications</h4>
              <p className="text-sm text-gray-600">{model.OtherSpecs}</p>
            </div>
          )}
          
          {model.SpecsJSON && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Technical Specifications</h4>
              <pre className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{model.SpecsJSON}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}