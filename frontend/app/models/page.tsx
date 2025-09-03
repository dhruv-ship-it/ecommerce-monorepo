"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Grid3X3, List, ShoppingCart } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

interface Model {
  ModelId: number
  Model: string
  Brand: number
  BrandName: string
  MaterialName: string
  ProductCategoryId: number
  ProductCategory: string
  ProductCount: number
  MinPrice: number
  MaxPrice: number
  AvailableColors: string
  AvailableSizes: string
  availableColors: string[]
  availableSizes: string[]
  availableColorIds: number[]
  availableSizeIds: number[]
  thumbnail: string
  mainImage: string
  Warranty: string
  Guarantee: string
  SpecsJSON: string
  IsWaterResistant: string
  IsFireProof: string
  IsEcoFriendly: string
  IsRecyclable: string
}

interface FilterOptions {
  categories: any[]
}

const API = process.env.NEXT_PUBLIC_API_URL

export default function ModelsPage() {
  const searchParams = useSearchParams()
  const categoryId = searchParams.get('categoryId')

  const [models, setModels] = useState<Model[]>([])
  const [filteredModels, setFilteredModels] = useState<Model[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    categories: []
  })
  
  const [filters, setFilters] = useState({
    category: categoryId || '',
    sortBy: 'newest'
  })
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchModels()
    fetchFilterOptions()
  }, []) // Only run once on mount

  useEffect(() => {
    // This runs when categoryId changes (including when it becomes null for "All Products")
    if (categoryId) {
      setFilters(prev => ({ ...prev, category: categoryId }))
    } else {
      // Reset filters when going to "All Products"
      setFilters(prev => ({ ...prev, category: '' }))
    }
    // Always re-fetch models when categoryId changes (including null)
    fetchModels()
  }, [categoryId])

  useEffect(() => {
    applyFilters()
  }, [models, filters])

  async function fetchModels() {
    try {
      setLoading(true)
      console.log('Fetching models for categoryId:', categoryId)
      
      const url = categoryId 
        ? `${API}/models/category/${categoryId}`
        : `${API}/models`
      
      console.log('API URL:', url)
      
      const response = await fetch(url)
      const data = await response.json()
      
      console.log('API Response:', data)
      
      if (response.ok) {
        setModels(data.models || [])
        console.log('Set models:', data.models?.length || 0)
      } else {
        console.error('Failed to fetch models:', data.error)
        setModels([])
      }
    } catch (error) {
      console.error('Error fetching models:', error)
      setModels([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchFilterOptions() {
    try {
      const categoriesRes = await fetch(`${API}/products/categories/all`)
      const categories = await categoriesRes.json()

      setFilterOptions({
        categories: categories.categories || []
      })
    } catch (error) {
      console.error('Error fetching filter options:', error)
    }
  }

  function applyFilters() {
    let filtered = [...models]

    // Category filter
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(model => 
        model.ProductCategoryId?.toString() === filters.category
      )
    }

    // Sort
    switch (filters.sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.MinPrice - b.MinPrice)
        break
      case 'price-high':
        filtered.sort((a, b) => b.MaxPrice - a.MaxPrice)
        break
      case 'name':
        filtered.sort((a, b) => a.Model.localeCompare(b.Model))
        break
      default: // newest
        filtered.sort((a, b) => b.ModelId - a.ModelId)
    }

    setFilteredModels(filtered)
  }

  const resetFilters = () => {
    setFilters({
      category: 'all',
      sortBy: 'newest'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
      <div className="text-center">Loading models...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {categoryId ? `${filterOptions.categories.find(cat => cat.ProductCategoryId.toString() === categoryId)?.ProductCategory || 'Category'} Models` : 'All Models'}
          </h1>
          <p className="text-gray-600">
            {filteredModels.length} {filteredModels.length === 1 ? 'model' : 'models'} found
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

      {/* Models Grid */}
      {filteredModels.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <ShoppingCart className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No models found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your sort options or browse different categories</p>
          <Button onClick={resetFilters}>Reset Filters</Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredModels.map((model) => (
            <Card key={model.ModelId} className="overflow-hidden hover:shadow-lg transition-shadow">
              <Link href={`/models/${model.ModelId}`}>
                <div className="aspect-square relative">
                  <Image
                    src={model.thumbnail ? `${API}${model.thumbnail}` : "/placeholder.svg"}
                    alt={model.Model}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {model.IsWaterResistant === 'Y' && (
                      <Badge variant="secondary" className="text-xs px-2 py-1">Waterproof</Badge>
                    )}
                    {model.IsEcoFriendly === 'Y' && (
                      <Badge variant="secondary" className="text-xs px-2 py-1">Eco-Friendly</Badge>
                    )}
                    {model.IsFireProof === 'Y' && (
                      <Badge variant="secondary" className="text-xs px-2 py-1">Fireproof</Badge>
                    )}
                  </div>
                </div>
              </Link>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    {model.BrandName}
                  </Badge>
                </div>
                
                <Link href={`/models/${model.ModelId}`}>
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2 hover:text-blue-600">
                    {model.Model}
                  </h3>
                </Link>
                
                <p className="text-xs text-gray-600 mb-2">{model.MaterialName}</p>
                
                {/* Available Colors & Sizes */}
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">Colors: {model.availableColors.slice(0, 3).join(', ')}{model.availableColors.length > 3 ? '...' : ''}</div>
                  <div className="text-xs text-gray-500">Sizes: {model.availableSizes.slice(0, 3).join(', ')}{model.availableSizes.length > 3 ? '...' : ''}</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">
                      {model.MinPrice === model.MaxPrice ? (
                        <span className="font-bold text-lg text-blue-600">₹{model.MinPrice?.toLocaleString()}</span>
                      ) : (
                        <span className="font-bold text-lg text-blue-600">₹{model.MinPrice?.toLocaleString()} - ₹{model.MaxPrice?.toLocaleString()}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {model.ProductCount} variant{model.ProductCount > 1 ? 's' : ''} available
                    </div>
                  </div>
                  <Button size="sm">
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredModels.map((model) => (
            <Card key={model.ModelId} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Link href={`/models/${model.ModelId}`}>
                    <div className="w-24 h-24 relative flex-shrink-0">
                      <Image
                        src={model.thumbnail ? `${API}${model.thumbnail}` : "/placeholder.svg"}
                        alt={model.Model}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  </Link>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link href={`/models/${model.ModelId}`}>
                          <h3 className="font-semibold hover:text-blue-600">{model.Model}</h3>
                        </Link>
                        <p className="text-sm text-gray-600">{model.BrandName} - {model.MaterialName}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span>Colors: {model.availableColors.join(', ')}</span>
                          <span>Sizes: {model.availableSizes.join(', ')}</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {model.IsWaterResistant === 'Y' && <Badge variant="secondary" className="text-xs">Waterproof</Badge>}
                          {model.IsEcoFriendly === 'Y' && <Badge variant="secondary" className="text-xs">Eco-Friendly</Badge>}
                          {model.IsFireProof === 'Y' && <Badge variant="secondary" className="text-xs">Fireproof</Badge>}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-lg text-blue-600">
                          {model.MinPrice === model.MaxPrice ? (
                            `₹${model.MinPrice?.toLocaleString()}`
                          ) : (
                            `₹${model.MinPrice?.toLocaleString()} - ₹${model.MaxPrice?.toLocaleString()}`
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {model.ProductCount} variant{model.ProductCount > 1 ? 's' : ''} available
                        </div>
                        <Button size="sm" className="mt-2">
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          View Model
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
  )
}