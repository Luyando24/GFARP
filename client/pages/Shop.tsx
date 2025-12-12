import { ShoppingCart, Star, Filter, Search, Grid, List, Heart, Eye, Package, Truck, Shield, CreditCard, Trophy, Menu, Globe, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from 'react';

export default function Shop() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const categories = [
    { id: 'all', name: 'All Products' },
    { id: 'equipment', name: 'Training Equipment' },
    { id: 'apparel', name: 'Apparel' },
    { id: 'accessories', name: 'Accessories' },
    { id: 'books', name: 'Training Guides' }
  ];

  const products = [
    {
      id: 1,
      name: 'Professional Training Cones',
      price: 29.99,
      originalPrice: 39.99,
      image: '/placeholder.svg',
      rating: 4.8,
      reviews: 124,
      category: 'equipment',
      badge: 'Best Seller'
    },
    {
      id: 2,
      name: 'Soccer Circular Academy Jersey',
      price: 49.99,
      originalPrice: null,
      image: '/placeholder.svg',
      rating: 4.9,
      reviews: 89,
      category: 'apparel',
      badge: 'New'
    },
    {
      id: 3,
      name: 'Speed Ladder Set',
      price: 24.99,
      originalPrice: 34.99,
      image: '/placeholder.svg',
      rating: 4.7,
      reviews: 156,
      category: 'equipment',
      badge: 'Sale'
    },
    {
      id: 4,
      name: 'Football Training Manual',
      price: 19.99,
      originalPrice: null,
      image: '/placeholder.svg',
      rating: 4.6,
      reviews: 78,
      category: 'books',
      badge: null
    },
    {
      id: 5,
      name: 'Water Bottle Set',
      price: 15.99,
      originalPrice: 22.99,
      image: '/placeholder.svg',
      rating: 4.5,
      reviews: 203,
      category: 'accessories',
      badge: 'Sale'
    },
    {
      id: 6,
      name: 'Training Shorts',
      price: 34.99,
      originalPrice: null,
      image: '/placeholder.svg',
      rating: 4.8,
      reviews: 67,
      category: 'apparel',
      badge: null
    }
  ];

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50">
        {/* Top Bar */}
        <div className="bg-[#005391] text-white text-xs">
          <div className="px-4 py-2">
            <div className="flex items-center justify-end gap-6">
              <a href="#about" className="hover:text-yellow-300 transition-colors font-medium">ABOUT US</a>
              <a href="#support" className="hover:text-yellow-300 transition-colors font-medium">SUPPORT</a>
              <Link to="/shop" className="hover:text-yellow-300 transition-colors font-medium text-yellow-300">SHOP</Link>
              <a href="#blog" className="hover:text-yellow-300 transition-colors font-medium">BLOG</a>
              <a href="#help" className="hover:text-yellow-300 transition-colors font-medium">HELP CENTER</a>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="bg-gradient-to-r from-[#005391] via-[#0066b3] to-[#005391] shadow-2xl border-b-4 border-yellow-400 relative">
          {/* Dynamic background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
          </div>
          
          <div className="px-2 relative">
            <div className="flex items-center justify-between py-3">
              {/* Left side - Hamburger Menu */}
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-white hover:bg-white/20 rounded-lg">
                  <Menu className="h-6 w-6" />
                </Button>
                
                {/* Soccer Circular Logo */}
                <Link to="/" className="flex items-center gap-3 group">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-white to-gray-100 rounded-full flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all duration-500 group-hover:scale-110">
                      <Trophy className="h-5 w-5 text-[#005391] group-hover:text-yellow-500 transition-colors duration-300" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                      <Star className="h-2 w-2 text-white" />
                    </div>
                  </div>
                  <div className="text-white">
                    <div className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-yellow-100 bg-clip-text text-transparent">
                      Soccer Circular
                    </div>
                  </div>
                </Link>
              </div>
              
              {/* Center - Desktop Navigation */}
              <nav className={`hidden lg:flex items-center gap-1 transition-all duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-100'}`}>
                {[
                  { href: "/", label: "HOME" },
                  { href: "#features", label: "FEATURES" },
                  { href: "#benefits", label: "BENEFITS" },
                  { href: "#pricing", label: "PRICING" },
                  { href: "/shop", label: "SHOP" }
                ].map((item) => (
                  <Link 
                    key={item.href}
                    to={item.href} 
                    className={`px-3 py-2 text-white font-bold text-xs tracking-wide hover:bg-white/20 rounded-lg transition-all duration-300 hover:scale-105 hover:text-yellow-300 relative group ${item.label === 'SHOP' ? 'text-yellow-300' : ''}`}
                  >
                    {item.label}
                    <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-400 group-hover:w-full transition-all duration-300"></div>
                  </Link>
                ))}
              </nav>
            
              {/* Right side - Search, Language, User */}
              <div className="flex items-center gap-3">
                <Link to="/shop">
                  <Button variant="ghost" className="p-2 text-white hover:bg-white/20 rounded-lg hidden lg:flex">
                    <ShoppingCart className="h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="ghost" className="p-2 text-white hover:bg-white/20 rounded-lg hidden lg:flex">
                  <Globe className="h-5 w-5" />
                </Button>
                <Button asChild className="bg-white text-[#005391] hover:bg-yellow-400 hover:text-black font-bold px-4 py-2 rounded-full text-xs lg:flex hidden">
                  <Link to="/academy-registration">GET STARTED</Link>
                </Button>
                <Button variant="ghost" className="p-2 text-white hover:bg-white/20 rounded-lg">
                  <User className="h-5 w-5" />
                </Button>
                
                {/* Mobile Sign In */}
                <Button asChild className="bg-white text-[#005391] hover:bg-yellow-400 hover:text-black font-bold px-4 py-2 rounded-full text-sm lg:hidden">
                  <Link to="/academy-registration">GET STARTED</Link>
                </Button>
              </div>
            </div>
            
            {isMenuOpen && (
              <>
                {/* Overlay */}
                <div 
                  className="fixed inset-0 bg-black bg-opacity-50 z-40"
                  onClick={() => setIsMenuOpen(false)}
                />
                {/* Menu */}
                <div className="bg-gradient-to-b from-[#005391] to-[#0066b3] border-t-2 border-yellow-400 absolute top-full left-0 w-80 z-50 shadow-2xl">
                  <nav className="flex flex-col gap-2 p-6">
                  {[
                    { href: "/", label: "HOME" },
                    { href: "#features", label: "FEATURES" },
                    { href: "#benefits", label: "BENEFITS" },
                    { href: "#pricing", label: "PRICING" },
                    { href: "/shop", label: "SHOP" }
                  ].map((item) => (
                    <Link 
                      key={item.href}
                      to={item.href} 
                      className={`text-white font-bold py-3 px-4 hover:bg-white/20 rounded-lg transition-all duration-300 hover:text-yellow-300 border-l-4 border-transparent hover:border-yellow-400 ${item.label === 'SHOP' ? 'text-yellow-300 border-yellow-400' : ''}`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Button asChild className="mt-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-500 hover:to-yellow-600 font-bold py-3 rounded-full shadow-xl">
                    <Link to="/academy-registration">REGISTER ACADEMY</Link>
                  </Button>
                </nav>
              </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Header */}
      <div className="bg-gradient-to-r from-[#005391] via-[#0066b3] to-[#005391] text-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Soccer Circular Shop</h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Premium football training equipment and academy merchandise
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                onClick={() => setViewMode('grid')}
                className="px-3 py-3 rounded-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => setViewMode('list')}
                className="px-3 py-3 rounded-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
                {product.badge && (
                  <span className={`absolute top-2 left-2 px-2 py-1 text-xs font-bold rounded ${
                    product.badge === 'Sale' ? 'bg-red-500 text-white' :
                    product.badge === 'New' ? 'bg-green-500 text-white' :
                    'bg-blue-500 text-white'
                  }`}>
                    {product.badge}
                  </span>
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button variant="ghost" size="sm" className="p-2 bg-white/80 hover:bg-white">
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2 bg-white/80 hover:bg-white">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">({product.reviews})</span>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl font-bold text-[#005391]">${product.price}</span>
                  {product.originalPrice && (
                    <span className="text-sm text-gray-500 line-through">${product.originalPrice}</span>
                  )}
                </div>
                
                <Button className="w-full bg-[#005391] hover:bg-[#004080] text-white">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-[#005391] rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold mb-2">Free Shipping</h3>
            <p className="text-gray-600 text-sm">On orders over $50</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-[#005391] rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold mb-2">Quality Guarantee</h3>
            <p className="text-gray-600 text-sm">30-day return policy</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-[#005391] rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold mb-2">Secure Payment</h3>
            <p className="text-gray-600 text-sm">SSL encrypted checkout</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-[#005391] rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold mb-2">Fast Delivery</h3>
            <p className="text-gray-600 text-sm">2-3 business days</p>
          </div>
        </div>
      </div>
    </div>
  );
}