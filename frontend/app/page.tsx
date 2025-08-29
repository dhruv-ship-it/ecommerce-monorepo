import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, ShoppingCart, ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

// Mock data - replace with API calls
const featuredProducts = [
  {
    id: 1,
    title: "Wireless Bluetooth Headphones",
    price: 79.99,
    originalPrice: 99.99,
    rating: 4.5,
    reviews: 1234,
    image: "/placeholder.svg?height=200&width=200",
    badge: "Best Seller",
  },
  {
    id: 2,
    title: "Smart Watch Series 8",
    price: 299.99,
    originalPrice: 399.99,
    rating: 4.8,
    reviews: 856,
    image: "/placeholder.svg?height=200&width=200",
    badge: "New",
  },
  {
    id: 3,
    title: "Laptop Stand Adjustable",
    price: 49.99,
    originalPrice: 69.99,
    rating: 4.3,
    reviews: 432,
    image: "/placeholder.svg?height=200&width=200",
    badge: "Sale",
  },
  {
    id: 4,
    title: "USB-C Hub 7-in-1",
    price: 34.99,
    originalPrice: 49.99,
    rating: 4.6,
    reviews: 789,
    image: "/placeholder.svg?height=200&width=200",
    badge: "Deal",
  },
]

const categories = [
  { name: "Electronics", image: "/placeholder.svg?height=150&width=150", count: "10,000+" },
  { name: "Fashion", image: "/placeholder.svg?height=150&width=150", count: "25,000+" },
  { name: "Home & Garden", image: "/placeholder.svg?height=150&width=150", count: "15,000+" },
  { name: "Sports", image: "/placeholder.svg?height=150&width=150", count: "8,000+" },
  { name: "Books", image: "/placeholder.svg?height=150&width=150", count: "50,000+" },
  { name: "Health", image: "/placeholder.svg?height=150&width=150", count: "12,000+" },
]

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 mb-8">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold mb-4">Welcome to Our Store</h1>
          <p className="text-xl mb-6">Discover amazing products at unbeatable prices</p>
          <Button size="lg" variant="secondary">
            Shop Now <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Categories */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Shop by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Link key={category.name} href={`/products?category=${category.name.toLowerCase()}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <Image
                    src={category.image || "/placeholder.svg"}
                    alt={category.name}
                    width={100}
                    height={100}
                    className="mx-auto mb-2 rounded-lg"
                  />
                  <h3 className="font-semibold">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.count} items</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Featured Products</h2>
          <Link href="/products">
            <Button variant="outline">View All</Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="p-0">
                <div className="relative">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.title}
                    width={300}
                    height={200}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  {product.badge && (
                    <Badge className="absolute top-2 left-2" variant="destructive">
                      {product.badge}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-lg mb-2 line-clamp-2">{product.title}</CardTitle>
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
      </section>

      {/* Special Offers */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Special Offers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-r from-orange-400 to-red-500 text-white">
            <CardContent className="p-6">
              <h3 className="text-2xl font-bold mb-2">Flash Sale</h3>
              <p className="mb-4">Up to 50% off on selected items</p>
              <Button variant="secondary">Shop Now</Button>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-green-400 to-blue-500 text-white">
            <CardContent className="p-6">
              <h3 className="text-2xl font-bold mb-2">Free Shipping</h3>
              <p className="mb-4">On orders over $50</p>
              <Button variant="secondary">Learn More</Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
