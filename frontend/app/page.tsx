import { Button } from "@/components/ui/button"
import { ArrowRight, ShoppingCart } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-blue-600">Smart Kart</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Discover the perfect products for every occasion. From electronics to fashion, 
            home essentials to gadgets, find everything you need from top global brands.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/models">
              <Button size="lg" className="text-lg px-8 py-4">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Browse Items
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            
            <Link href="/models">
              <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                View All Products
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Featured Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-blue-600 mb-2">10+</div>
            <div className="text-gray-600">Premium Brands</div>
          </div>
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-purple-600 mb-2">100+</div>
            <div className="text-gray-600">Product Models</div>
          </div>
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-green-600 mb-2">24/7</div>
            <div className="text-gray-600">Customer Support</div>
          </div>
        </div>
      </div>
    </div>
  )
}