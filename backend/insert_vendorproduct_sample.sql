-- Sample VendorProduct data for testing
-- Using existing Product data and User table for Vendor and Courier references

USE ecomv1;

-- Insert sample VendorProduct entries
-- Note: Courier field represents the preferred courier company for this vendor-product combination

INSERT INTO VendorProduct (
    Vendor, 
    Product, 
    Courier, 
    MRP_SS, 
    Discount, 
    GST_SS, 
    StockQty, 
    IsNotAvailable, 
    IsDeleted, 
    RecordCreationLogin
) VALUES 
-- Nike Air Max - Black - 9UK (ProductId: 1) from vendor0 (UserId: 31) with courier0 (UserId: 33)
(31, 1, 33, 8999.00, 10.00, 18.00, 25, 'N', 'N', 'admin'),

-- Nike Air Max - White - 10UK (ProductId: 2) from vendor0 (UserId: 31) with courier0 (UserId: 33)  
(31, 2, 33, 8999.00, 15.00, 18.00, 30, 'N', 'N', 'admin'),

-- Nike Revolution - Blue - 10UK (ProductId: 3) from anand vendor (UserId: 34) with ritvik courier (UserId: 38)
(34, 3, 38, 6499.00, 5.00, 18.00, 20, 'N', 'N', 'admin'),

-- Adidas Ultraboost - Black - 9UK (ProductId: 4) from vendor0 (UserId: 31) with courier0 (UserId: 33)
(31, 4, 33, 12999.00, 12.00, 18.00, 15, 'N', 'N', 'admin'),

-- Adidas Ultraboost - White - 10UK (ProductId: 5) from anand vendor (UserId: 34) with ritvik courier (UserId: 38)
(34, 5, 38, 12999.00, 8.00, 18.00, 22, 'N', 'N', 'admin'),

-- Additional entries for better testing - same products from different vendors with different pricing
-- Nike Air Max - Black - 9UK (ProductId: 1) from anand vendor (UserId: 34) with ritvik courier (UserId: 38) - Different pricing
(34, 1, 38, 8799.00, 8.00, 18.00, 18, 'N', 'N', 'admin'),

-- Nike Revolution - Blue - 10UK (ProductId: 3) from vendor0 (UserId: 31) with courier0 (UserId: 33) - Different pricing  
(31, 3, 33, 6299.00, 7.00, 18.00, 35, 'N', 'N', 'admin');

-- Verify the inserted data
SELECT 
    vp.VendorProductId,
    v.User AS VendorName,
    p.Product AS ProductName,
    c.User AS CourierName,
    vp.MRP_SS,
    vp.Discount,
    vp.StockQty
FROM VendorProduct vp
LEFT JOIN user v ON vp.Vendor = v.UserId AND v.IsVendor = 'Y'
LEFT JOIN Product p ON vp.Product = p.ProductId
LEFT JOIN user c ON vp.Courier = c.UserId AND c.IsCourier = 'Y'
WHERE vp.IsDeleted != 'Y'
ORDER BY vp.VendorProductId;