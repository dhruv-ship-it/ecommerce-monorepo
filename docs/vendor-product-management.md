# Vendor Product Management

This document describes the vendor product management feature implemented in the EcomGM system.

## Overview

The vendor product management feature allows vendors to:
- View all products in their catalog
- Add new products from the global product catalog to their own catalog
- Edit product details such as pricing, stock, and courier assignment
- Remove products from their catalog

## Features

### 1. View Vendor Products
- **Endpoint**: `GET /vendor/products`
- **Description**: Retrieves all products in the vendor's catalog with pricing, stock, and courier information
- **UI**: `/vendor-dashboard/products/page.tsx`

### 2. Add New Product
- **Endpoint**: `GET /vendor/available-products`
- **Description**: Retrieves all products from the global catalog that are not yet in the vendor's catalog
- **UI**: `/vendor-dashboard/products/new/page.tsx`

- **Endpoint**: `POST /vendor/product/add-existing`
- **Description**: Adds an existing product from the global catalog to the vendor's catalog with specified pricing, stock, and courier
- **Validation**: 
  - Product must exist in global catalog
  - Courier must be valid and active
  - Stock quantity must be greater than 0
  - Selling price must be greater than 0
  - Discount and GST must be between 0-100%

### 3. Edit Product
- **Endpoint**: `PUT /vendor/product/:id`
- **Description**: Updates product details in the vendor's catalog
- **UI**: `/vendor-dashboard/products/[id]/edit/page.tsx`
- **Editable fields**:
  - Courier assignment
  - Stock quantity
  - Selling price
  - Discount percentage
  - GST percentage
  - Availability status

### 4. Remove Product
- **Endpoint**: `DELETE /vendor/product/:id`
- **Description**: Removes a product from the vendor's catalog (soft delete)
- **Note**: This only removes the product from the vendor's catalog, not from the global product catalog

## Data Flow

1. Vendor logs into the dashboard
2. Vendor navigates to "My Products" page
3. Vendor can view all products in their catalog
4. Vendor can add new products by clicking "Add New Product"
5. System shows available products not yet in vendor's catalog
6. Vendor selects a product, courier, and sets pricing/stock details
7. Vendor can edit existing products to update details
8. Vendor can remove products from their catalog

## Security

- All endpoints require JWT authentication
- Vendors can only access/modify products in their own catalog
- Proper validation on both frontend and backend
- Couriers must be verified as active before assignment

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vendor/products` | Get vendor's products |
| GET | `/vendor/available-products` | Get products available for adding |
| GET | `/vendor/couriers` | Get available couriers |
| POST | `/vendor/product/add-existing` | Add existing product to vendor's catalog |
| PUT | `/vendor/product/:id` | Update vendor product details |
| DELETE | `/vendor/product/:id` | Remove product from vendor's catalog |

## UI Components

1. **Vendor Products Page** (`/vendor-dashboard/products/page.tsx`)
   - Displays all products in vendor's catalog
   - Shows pricing details, stock, courier info, and availability
   - Provides links to edit, view orders, and delete products

2. **Add Product Page** (`/vendor-dashboard/products/new/page.tsx`)
   - Form for adding new products to vendor's catalog
   - Product selection dropdown
   - Courier selection dropdown
   - Pricing and stock input fields
   - Price calculation preview

3. **Edit Product Page** (`/vendor-dashboard/products/[id]/edit/page.tsx`)
   - Form for editing existing products in vendor's catalog
   - Courier selection dropdown
   - Pricing and stock input fields
   - Availability toggle
   - Price calculation preview

## Validation Rules

### Frontend Validation
- All required fields must be filled
- Stock quantity must be 0 or greater
- Selling price must be greater than 0
- Discount and GST must be between 0-100%
- Courier must be selected

### Backend Validation
- Product must exist in global catalog
- Vendor must own the product record
- Courier must be valid and active
- All numerical values must be within valid ranges
- Proper authentication and authorization

## Error Handling

The system provides comprehensive error handling:
- Network errors
- Authentication errors
- Validation errors
- Database errors
- User-friendly error messages

## Success Feedback

The system provides clear success feedback:
- Success messages when products are added/updated/removed
- Automatic redirection after successful operations
- Success message persistence on return to products page