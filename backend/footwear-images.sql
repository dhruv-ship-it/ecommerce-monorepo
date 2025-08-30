-- Create product_images table and insert sample data
-- Run this after footwear-products.sql

-- Create the product_images table if it doesn't exist
CREATE TABLE IF NOT EXISTS `product_images` (
    `ImageId` int(8) unsigned NOT NULL AUTO_INCREMENT,
    `ProductId` int(8) unsigned NOT NULL,
    `ImageType` ENUM('thumbnail', 'main', 'gallery') NOT NULL DEFAULT 'gallery',
    `ImagePath` varchar(255) NOT NULL,
    `ImageOrder` int(2) DEFAULT 0,
    `IsActive` char(1) NOT NULL DEFAULT 'Y',
    `IsDeleted` char(1) NOT NULL DEFAULT '',
    `RecordCreationTimeStamp` datetime NOT NULL DEFAULT current_timestamp(),
    `RecordCreationLogin` varchar(10) NOT NULL DEFAULT '',
    `LastUpdationTimeStamp` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    `LastUpdationLogin` varchar(10) NOT NULL DEFAULT '',
    PRIMARY KEY (`ImageId`),
    KEY `ProductId` (`ProductId`),
    KEY `ImageType` (`ImageType`),
    KEY `IsActive` (`IsActive`),
    CONSTRAINT `fk_product_images_product` FOREIGN KEY (`ProductId`) REFERENCES `Product` (`ProductId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert images for each product
-- Note: These paths assume you'll create corresponding image files in your static directory

INSERT INTO product_images (
    ProductId,
    ImageType,
    ImagePath,
    ImageOrder,
    IsActive,
    IsDeleted,
    RecordCreationLogin,
    LastUpdationLogin
) 
SELECT 
    p.ProductId,
    img.ImageType,
    CONCAT('/static/images/products/', 
           LOWER(REPLACE(REPLACE(p.Product, ' ', '-'), '/', '-')), 
           CASE 
               WHEN img.ImageType = 'thumbnail' THEN '/thumb.jpg'
               WHEN img.ImageType = 'main' THEN '/main.jpg'
               ELSE CONCAT('/gallery/', img.ImageOrder, '.jpg')
           END) as ImagePath,
    img.ImageOrder,
    'Y' as IsActive,
    '' as IsDeleted,
    'ADMIN' as RecordCreationLogin,
    'ADMIN' as LastUpdationLogin
FROM Product p
CROSS JOIN (
    -- Generate one thumbnail, one main, and three gallery images for each product
    SELECT 'thumbnail' as ImageType, 1 as ImageOrder
    UNION ALL SELECT 'main', 2
    UNION ALL SELECT 'gallery', 3
    UNION ALL SELECT 'gallery', 4
    UNION ALL SELECT 'gallery', 5
) img
WHERE p.ProductCategory_Gen = (SELECT ProductCategoryId FROM ProductCategory WHERE ProductCategory = 'Footwear');

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_type ON product_images(ProductId, ImageType);
CREATE INDEX IF NOT EXISTS idx_product_images_active ON product_images(IsActive);
