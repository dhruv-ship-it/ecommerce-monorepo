"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Star, ShoppingCart, Filter } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

// Mock data - replace with API calls
const products = [
  {
    id: 1,
    title: "Wireless Bluetooth Headphones",
    price: 79.99,
    originalPrice: 99.99,
    rating: 4.5,
    reviews: 1234,
    image: "/placeholder.svg?height=200&width=200",
    category: "electronics",
    brand: "TechBrand",
    colors: ["black", "white", "blue"],
    sizes: ["S", "M", "L"],
  },
  {
    id: 2,
    title: "Smart Watch Series 8",
    price: 299.99,
    originalPrice: 399.99,
    rating: 4.8,
    reviews: 856,
    image: "/placeholder.svg?height=200&width=200",
    category: "electronics",
    brand: "SmartTech",
    colors: ["black", "silver", "gold"],
    sizes: ["38mm", "42mm"],
  },
  // Add more products...
]

const categories = ["electronics", "fashion", "home", "sports", "books", "health"]
const brands = ["TechBrand", "SmartTech", "FashionCo", "HomePlus", "SportsPro"]
const colors = ["black", "white", "blue", "red", "green", "silver", "gold"]
const sizes = ["XS", "S", "M", "L", "XL", "XXL"]
const materials = ["cotton", "polyester", "leather", "metal", "plastic", "wood"]

export default function ProductsPage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState([0, 1000])
  const [sortBy, setSortBy] = useState("relevance")
  const [showFilters, setShowFilters] = useState(false)

  const handleFilterChange = (type: string, value: string, checked: boolean) => {
    const setters = {
      category: setSelectedCategories,
      brand: setSelectedBrands,
      color: setSelectedColors,
      size: setSelectedSizes,
      material: setSelectedMaterials,
    }

    const setter = setters[type as keyof typeof setters]
    if (setter) {
      setter((prev) => (checked ? [...prev, value] : prev.filter((item) => item !== value)))
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-8">
        {/* Filter Sidebar */}
        <div className={`w-80 space-y-6 ${showFilters ? "block" : "hidden"} lg:block`}>
          <div className="flex items-center justify-between lg:hidden">
            <h2 className="text-xl font-bold">Filters</h2>
            <Button variant="ghost" onClick={() => setShowFilters(false)}>
              ×
            </Button>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold mb-3">Categories</h3>
            <div className="space-y-2">
              {categories.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category}`}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={(checked) => handleFilterChange("category", category, checked as boolean)}
                  />
                  <Label htmlFor={`category-${category}`} className="capitalize">
                    {category}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Brands */}
          <div>
            <h3 className="font-semibold mb-3">Brands</h3>
            <div className="space-y-2">
              {brands.map((brand) => (
                <div key={brand} className="flex items-center space-x-2">
                  <Checkbox
                    id={`brand-${brand}`}
                    checked={selectedBrands.includes(brand)}
                    onCheckedChange={(checked) => handleFilterChange("brand", brand, checked as boolean)}
                  />
                  <Label htmlFor={`brand-${brand}`}>{brand}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div>
            <h3 className="font-semibold mb-3">Colors</h3>
            <div className="space-y-2">
              {colors.map((color) => (
                <div key={color} className="flex items-center space-x-2">
                  <Checkbox
                    id={`color-${color}`}
                    checked={selectedColors.includes(color)}
                    onCheckedChange={(checked) => handleFilterChange("color", color, checked as boolean)}
                  />
                  <Label htmlFor={`color-${color}`} className="capitalize">
                    {color}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div>
            <h3 className="font-semibold mb-3">Sizes</h3>
            <div className="space-y-2">
              {sizes.map((size) => (
                <div key={size} className="flex items-center space-x-2">
                  <Checkbox
                    id={`size-${size}`}
                    checked={selectedSizes.includes(size)}
                    onCheckedChange={(checked) => handleFilterChange("size", size, checked as boolean)}
                  />
                  <Label htmlFor={`size-${size}`}>{size}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Materials */}
          <div>
            <h3 className="font-semibold mb-3">Materials</h3>
            <div className="space-y-2">
              {materials.map((material) => (
                <div key={material} className="flex items-center space-x-2">
                  <Checkbox
                    id={`material-${material}`}
                    checked={selectedMaterials.includes(material)}
                    onCheckedChange={(checked) => handleFilterChange("material", material, checked as boolean)}
                  />
                  <Label htmlFor={`material-${material}`} className="capitalize">
                    {material}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="font-semibold mb-3">Price Range</h3>
            <div className="px-2">
              <Slider value={priceRange} onValueChange={setPriceRange} max={1000} step={10} className="mb-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>${priceRange[0]}</span>
                <span>${priceRange[1]}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" className="lg:hidden bg-transparent" onClick={() => setShowFilters(true)}>
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <h1 className="text-2xl font-bold">Products</h1>
              <span className="text-muted-foreground">({products.length} results)</span>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Customer Rating</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="p-0">
                  <Link href={`/products/${product.id}`}>
                    <Image
                      src={product.image || "/placeholder.svg"}
                      alt={product.title}
                      width={300}
                      height={200}
                      className="w-full h-48 object-cover rounded-t-lg cursor-pointer"
                    />
                  </Link>
                </CardHeader>
                <CardContent className="p-4">
                  <Link href={`/products/${product.id}`}>
                    <CardTitle className="text-lg mb-2 line-clamp-2 hover:text-blue-600 cursor-pointer">
                      {product.title}
                    </CardTitle>
                  </Link>
                  <div className="flex items-center mb-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(product.rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground ml-2">({product.reviews})</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl font-bold">${product.price}</span>
                    {product.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through">${product.originalPrice}</span>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button className="w-full">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to Cart
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
