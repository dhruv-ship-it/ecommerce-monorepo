# 🥾 Footwear E-Commerce Setup Guide (CORRECTED)

This guide will help you set up a complete footwear e-commerce system with product images, categories, and shopping functionality.

## 📋 **What We've Built:**

1. ✅ **Product Images Table** - `product_images` table for storing image metadata
2. ✅ **Enhanced Product Routes** - Backend API with image support (corrected for your schema)
3. ✅ **Static Image Serving** - Backend serves images from `/static` directory
4. ✅ **Sample Footwear Data** - SQL scripts to populate your database (CORRECTED)
5. ✅ **Image Organization** - Structured folder system for product images

## 🚨 **IMPORTANT: This is CORRECTED for Your Actual Database Schema**

The original scripts had errors. These corrected versions:
- ✅ Use your actual `Product` table structure (`MRP` not `Price`, no `Brand`/`Material` columns)
- ✅ Use your existing footwear category (ID 186 - "Shoes" in Sports category)
- ✅ Match your actual database schema exactly

## 🚀 **Setup Steps:**

### **Step 1: Create the Database Tables**
Run these SQL scripts in your MariaDB/MySQL database (in this order):

1. **Create product_images table:**
   ```sql
   -- Run: backend/create-product-images-table.sql
   ```

2. **Populate with footwear products (CORRECTED):**
   ```sql
   -- Run: backend/create-footwear-products-corrected.sql
   ```

### **Step 2: Create Image Directory Structure**
```bash
# From your ecom root directory
mkdir -p static/images/products
mkdir -p static/images/products/nike-air-max-270-001
mkdir -p static/images/products/nike-air-max-270-001/gallery
mkdir -p static/images/products/adidas-ultraboost-002
mkdir -p static/images/products/adidas-ultraboost-002/gallery
mkdir -p static/images/products/converse-chuck-taylor-003
mkdir -p static/images/products/converse-chuck-taylor-003/gallery
mkdir -p static/images/products/vans-old-skool-004
mkdir -p static/images/products/vans-old-skool-004/gallery
mkdir -p static/images/products/new-balance-574-005
mkdir -p static/images/products/new-balance-574-005/gallery
```

### **Step 3: Add Product Images**
For each product folder, add these images:
- `thumb.jpg` (150x150px) - Thumbnail for product listings
- `main.jpg` (500x500px) - Main product image
- `gallery/1.jpg` (800x600px) - Gallery image 1
- `gallery/2.jpg` (800x600px) - Gallery image 2
- `gallery/3.jpg` (800x600px) - Gallery image 3

**Image Requirements:**
- **Thumbnail**: 150x150px, JPG format
- **Main Image**: 500x500px, JPG format  
- **Gallery Images**: 800x600px, JPG format
- **File Names**: Must match exactly (case-sensitive)

### **Step 4: Restart Backend Server**
```bash
cd backend
npm restart
```

### **Step 5: Test the API**
Test these endpoints:
- `GET /products` - List all products with images
- `GET /products/1` - Get product details with images
- `GET /products/categories/all` - Get all categories
- `GET /static/images/products/nike-air-max-270-001/thumb.jpg` - Test image serving

## 🗂️ **Directory Structure:**
```
ecom/
├── static/
│   └── images/
│       └── products/
│           ├── nike-air-max-270-001/
│           │   ├── thumb.jpg
│           │   ├── main.jpg
│           │   └── gallery/
│           │       ├── 1.jpg
│           │       ├── 2.jpg
│           │       └── 3.jpg
│           ├── adidas-ultraboost-002/
│           │   ├── thumb.jpg
│           │   ├── main.jpg
│           │   └── gallery/
│           │       └── 1.jpg
│           └── [other products...]
├── backend/
│   ├── create-product-images-table.sql
│   ├── create-footwear-products-corrected.sql  ← CORRECTED VERSION
│   └── routes/product.js (enhanced & corrected)
└── frontend/ (will use images via API)
```

## 🔧 **API Endpoints:**

### **Product Routes:**
- `GET /products` - List all products with images and categories
- `GET /products/:id` - Get product details with images
- `GET /products/category/:categoryId` - Get products by category
- `GET /products/categories/all` - Get all categories
- `GET /products/subcategories/:categoryId` - Get subcategories

### **Image Serving:**
- `GET /static/images/products/*` - Serve product images
- Both frontends can access images via: `http://localhost:4000/static/images/...`

## 📱 **Frontend Integration:**

### **Display Product Images:**
```jsx
// In your React components
<img 
  src={`http://localhost:4000${product.thumbnail}`} 
  alt={product.Product}
  className="product-thumbnail"
/>

// For main product image
<img 
  src={`http://localhost:4000${product.mainImage}`} 
  alt={product.Product}
  className="product-main-image"
/>

// For gallery images
{product.galleryImages.map((image, index) => (
  <img 
    key={index}
    src={`http://localhost:4000${image}`} 
    alt={`${product.Product} ${index + 1}`}
    className="gallery-image"
  />
))}
```

## 🧪 **Testing:**

1. **Backend API:**
   - Test product endpoints return images
   - Verify image paths are correct
   - Check static file serving works

2. **Frontend Display:**
   - Products page shows thumbnails
   - Product detail page shows main image + gallery
   - Images load without errors

3. **Shopping Flow:**
   - Browse products with images
   - Add to cart
   - Complete checkout process

## 🚨 **Common Issues:**

### **Images Not Loading:**
- Check file paths match exactly
- Verify backend static middleware is enabled
- Ensure image files exist in correct directories

### **Database Errors:**
- Run SQL scripts in correct order
- Check foreign key constraints
- Verify table names match your schema

### **API Errors:**
- Restart backend after changes
- Check console for error messages
- Verify database connection

## 🎯 **Next Steps:**

1. **Add Real Product Images** - Replace placeholders with actual footwear photos
2. **Enhance Frontend** - Update product pages to use real images
3. **Add to Cart** - Implement shopping cart functionality
4. **Test Complete Flow** - End-to-end customer journey

## 📞 **Need Help?**

If you encounter issues:
1. Check backend console for errors
2. Verify database tables were created
3. Test API endpoints individually
4. Ensure image files exist and are accessible

## ✅ **What's Fixed:**

- **Database Schema**: Now matches your actual `Product` table structure
- **Categories**: Uses your existing "Shoes" subcategory (ID 186)
- **Columns**: Only uses columns that actually exist in your database
- **Foreign Keys**: Properly references your existing tables

**Your footwear e-commerce system is now ready to be populated with real products and images!** 🎉
