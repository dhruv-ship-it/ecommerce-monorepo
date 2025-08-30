"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Filter, Grid3X3, List, ShoppingCart, Heart, Star } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

interface Product {
  ProductId: number
  Product: string
  ProductCategoryId: number
  ProductCategory: string
  ProductSubCategoryName: string
  ModelName: string
  BrandName: string
  ColorName: string
  SizeName: string
  MaterialName: string
  UnitName: string
  CurrencyName: string
  MRP: number
  Quantity: number
  thumbnail: string
  mainImage: string
  images: any[]
}

interface FilterOptions {
  categories: any[]
  brands: any[]
  colors: any[]
  sizes: any[]
  materials: any[]
}

const API = process.env.NEXT_PUBLIC_API_URL

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const categoryId = searchParams.get('categoryId')

  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    categories: [],
    brands: [],
    colors: [],
    sizes: [],
    materials: []
  })
  
  const [filters, setFilters] = useState({
    search: '',
    category: categoryId || '',
    brand: '',
    color: '',
    size: '',
    material: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'newest'
  })
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
    fetchFilterOptions()
  }, [])

  useEffect(() => {
    if (categoryId) {
      setFilters(prev => ({ ...prev, category: categoryId }))
    }
  }, [categoryId])

  useEffect(() => {
    applyFilters()
  }, [products, filters])

  async function fetchProducts() {
    try {
      setLoading(true)
      const url = categoryId 
        ? `${API}/products/category/${categoryId}`
        : `${API}/products`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (response.ok) {
        setProducts(data.products || [])
      } else {
        console.error('Failed to fetch products:', data.error)
        setProducts([])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchFilterOptions() {
    try {
      const [categoriesRes, brandsRes, colorsRes, sizesRes, materialsRes] = await Promise.all([
        fetch(`${API}/products/categories/all`),
        fetch(`${API}/products/brands/all`),
        fetch(`${API}/products/colors/all`),
        fetch(`${API}/products/sizes/all`),
        fetch(`${API}/products/materials/all`)
      ])

      const [categories, brands, colors, sizes, materials] = await Promise.all([
        categoriesRes.json(),
        brandsRes.json(),
        colorsRes.json(),
        sizesRes.json(),
        materialsRes.json()
      ])

      setFilterOptions({
        categories: categories.categories || [],
        brands: brands.brands || [],
        colors: colors.colors || [],
        sizes: sizes.sizes || [],
        materials: materials.materials || []
      })
    } catch (error) {
      console.error('Error fetching filter options:', error)
    }
  }

  function applyFilters() {
    let filtered = [...products]

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(product =>
        product.Product.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.BrandName?.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.ModelName?.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    // Category filter
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(product => 
        product.ProductCategoryId?.toString() === filters.category
      )
    }

    // Brand filter
    if (filters.brand && filters.brand !== 'all') {
      filtered = filtered.filter(product => product.BrandName === filters.brand)
    }

    // Color filter
    if (filters.color && filters.color !== 'all') {
      filtered = filtered.filter(product => product.ColorName === filters.color)
    }

    // Size filter
    if (filters.size && filters.size !== 'all') {
      filtered = filtered.filter(product => product.SizeName === filters.size)
    }

    // Material filter
    if (filters.material && filters.material !== 'all') {
      filtered = filtered.filter(product => product.MaterialName === filters.material)
    }

    // Price filter
    if (filters.minPrice) {
      filtered = filtered.filter(product => product.MRP >= parseInt(filters.minPrice))
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(product => product.MRP <= parseInt(filters.maxPrice))
    }

    // Sort
    switch (filters.sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.MRP - b.MRP)
        break
      case 'price-high':
        filtered.sort((a, b) => b.MRP - a.MRP)
        break
      case 'name':
        filtered.sort((a, b) => a.Product.localeCompare(b.Product))
        break
      default: // newest
        filtered.sort((a, b) => b.ProductId - a.ProductId)
    }

    setFilteredProducts(filtered)
  }

  const resetFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      brand: 'all',
      color: 'all',
      size: 'all',
      material: 'all',
      minPrice: '',
      maxPrice: '',
      sortBy: 'newest'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {categoryId ? `${filterOptions.categories.find(cat => cat.ProductCategoryId.toString() === categoryId)?.ProductCategory || 'Category'} Products` : 'All Products'}
          </h1>
          <p className="text-gray-600">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
          </p>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          {/* Sort */}
          <Select value={filters.sortBy} onValueChange={(value) => setFilters({ ...filters, sortBy: value })}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
          
          {/* View Mode */}
          <div className="flex border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </h3>
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Clear All
                </Button>
              </div>

              <div className="space-y-6">
                {/* Search */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search products..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {filterOptions.categories.map((category) => (
                        <SelectItem key={category.ProductCategoryId} value={category.ProductCategoryId.toString()}>
                          {category.ProductCategory}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Brand */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Brand</label>
                  <Select value={filters.brand} onValueChange={(value) => setFilters({ ...filters, brand: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Brands" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands</SelectItem>
                      {filterOptions.brands.map((brand) => (
                        <SelectItem key={brand.BrandId} value={brand.BrandName}>
                          {brand.BrandName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Color */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Color</label>
                  <Select value={filters.color} onValueChange={(value) => setFilters({ ...filters, color: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Colors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Colors</SelectItem>
                      {filterOptions.colors.map((color) => (
                        <SelectItem key={color.ColorId} value={color.ColorName}>
                          {color.ColorName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Size */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Size</label>
                  <Select value={filters.size} onValueChange={(value) => setFilters({ ...filters, size: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sizes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sizes</SelectItem>
                      {filterOptions.sizes.map((size) => (
                        <SelectItem key={size.SizeId} value={size.SizeName}>
                          {size.SizeName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Material */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Material</label>
                  <Select value={filters.material} onValueChange={(value) => setFilters({ ...filters, material: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Materials" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Materials</SelectItem>
                      {filterOptions.materials.map((material) => (
                        <SelectItem key={material.MaterialId} value={material.MaterialName}>
                          {material.MaterialName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Price Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Min"
                      type="number"
                      value={filters.minPrice}
                      onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                    />
                    <Input
                      placeholder="Max"
                      type="number"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Grid */}
        <div className="lg:col-span-3">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <ShoppingCart className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No products found</h3>
              <p className="text-gray-500 mb-4">Try adjusting your filters or search terms</p>
              <Button onClick={resetFilters}>Clear All Filters</Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.ProductId} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <Link href={`/products/${product.ProductId}`}>
                    <div className="aspect-square relative">
                      <Image
                        src={product.thumbnail ? `${API}${product.thumbnail}` : "/placeholder.svg"}
                        alt={product.Product}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                          <Heart className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Link>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {product.BrandName}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-gray-600">4.5</span>
                      </div>
                    </div>
                    
                    <Link href={`/products/${product.ProductId}`}>
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2 hover:text-blue-600">
                        {product.Product}
                      </h3>
                    </Link>
                    
                    <p className="text-xs text-gray-600 mb-2">{product.ModelName}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span>{product.ColorName}</span>
                      <span>{product.SizeName}</span>
                      <span>{product.MaterialName}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-lg text-blue-600">₹{product.MRP.toLocaleString()}</span>
                        <div className="text-xs text-gray-500">
                          {product.Quantity > 0 ? `${product.Quantity} in stock` : 'Out of stock'}
                        </div>
                      </div>
                      <Button size="sm" disabled={product.Quantity === 0}>
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        {product.Quantity === 0 ? 'Out of Stock' : 'Add'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <Card key={product.ProductId} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <Link href={`/products/${product.ProductId}`}>
                        <div className="w-24 h-24 relative flex-shrink-0">
                          <Image
                            src={product.thumbnail ? `${API}${product.thumbnail}` : "/placeholder.svg"}
                            alt={product.Product}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      </Link>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <Link href={`/products/${product.ProductId}`}>
                              <h3 className="font-semibold hover:text-blue-600">{product.Product}</h3>
                            </Link>
                            <p className="text-sm text-gray-600">{product.BrandName} - {product.ModelName}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <span>Color: {product.ColorName}</span>
                              <span>Size: {product.SizeName}</span>
                              <span>Material: {product.MaterialName}</span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-bold text-lg text-blue-600">₹{product.MRP.toLocaleString()}</div>
                            <div className="text-sm text-gray-500">
                              {product.Quantity > 0 ? `${product.Quantity} in stock` : 'Out of stock'}
                            </div>
                            <Button size="sm" className="mt-2" disabled={product.Quantity === 0}>
                              <ShoppingCart className="h-4 w-4 mr-1" />
                              {product.Quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

