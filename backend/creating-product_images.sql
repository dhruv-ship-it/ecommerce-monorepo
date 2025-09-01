-- =====================================================
-- DROP and CREATE product_images table fresh
-- =====================================================
DROP TABLE IF EXISTS `product_images`;

CREATE TABLE `product_images` (
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

-- =====================================================
-- INSERT images for all products (Footwear, Clothing, Accessories)
-- Normalized slug: lowercase, spaces -> '-', multiple dashes collapsed
-- =====================================================
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
    CONCAT(
        '/static/images/products/',
        REGEXP_REPLACE(
            LOWER(REPLACE(REPLACE(p.Product, ' ', '-'), '/', '-')),
            '-+',
            '-'
        ),
        CASE 
            WHEN img.ImageType = 'thumbnail' THEN '/thumb.jpg'
            WHEN img.ImageType = 'main' THEN '/main.jpg'
            ELSE CONCAT('/gallery/', img.ImageOrder - 2, '.jpg')
        END
    ) AS ImagePath,
    img.ImageOrder,
    'Y' AS IsActive,
    '' AS IsDeleted,
    'ADMIN' AS RecordCreationLogin,
    'ADMIN' AS LastUpdationLogin
FROM Product p
CROSS JOIN (
    -- One thumbnail, one main, three gallery images
    SELECT 'thumbnail' AS ImageType, 1 AS ImageOrder
    UNION ALL SELECT 'main', 2
    UNION ALL SELECT 'gallery', 3
    UNION ALL SELECT 'gallery', 4
    UNION ALL SELECT 'gallery', 5
) img
WHERE p.ProductCategory_Gen IN (
    SELECT ProductCategoryId FROM ProductCategory 
    WHERE ProductCategory IN ('Footwear','Clothing','Accessories')
);

-- =====================================================
-- INDEXES for faster queries
-- =====================================================
CREATE INDEX idx_product_images_product_type ON product_images(ProductId, ImageType);
CREATE INDEX idx_product_images_active ON product_images(IsActive);
