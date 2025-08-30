-- Setup footwear categories and basic data
-- This script sets up the initial categories and required data for the footwear e-commerce

-- Add main footwear category
INSERT INTO ProductCategory (ProductCategory, IsDeleted) 
VALUES ('Footwear', '') 
ON DUPLICATE KEY UPDATE IsDeleted = '';

-- Add footwear subcategories
INSERT INTO ProductSubCategory (ProductSubCategory, ProductCategory, IsDeleted) 
SELECT 'Running Shoes', ProductCategoryId, '' FROM ProductCategory WHERE ProductCategory = 'Footwear'
UNION ALL
SELECT 'Casual Shoes', ProductCategoryId, '' FROM ProductCategory WHERE ProductCategory = 'Footwear'
UNION ALL
SELECT 'Formal Shoes', ProductCategoryId, '' FROM ProductCategory WHERE ProductCategory = 'Footwear'
UNION ALL
SELECT 'Sports Shoes', ProductCategoryId, '' FROM ProductCategory WHERE ProductCategory = 'Footwear'
UNION ALL
SELECT 'Boots', ProductCategoryId, '' FROM ProductCategory WHERE ProductCategory = 'Footwear'
UNION ALL
SELECT 'Sneakers', ProductCategoryId, '' FROM ProductCategory WHERE ProductCategory = 'Footwear';

-- Add currency (if not exists)
INSERT INTO Currency (Currency, IsDeleted) 
VALUES ('INR', '') 
ON DUPLICATE KEY UPDATE IsDeleted = '';

-- Add units for footwear
INSERT INTO Unit (Unit, IsDeleted) 
VALUES ('Pair', '') 
ON DUPLICATE KEY UPDATE IsDeleted = '';

-- Add footwear brands
INSERT INTO Brand (Brand, Company, IsDeleted) VALUES 
('Nike', 1, ''),
('Adidas', 2, ''),
('Puma', 3, ''),
('Reebok', 4, ''),
('New Balance', 5, ''),
('ASICS', 6, ''),
('Under Armour', 7, ''),
('Converse', 8, ''),
('Vans', 9, ''),
('Skechers', 10, '')
ON DUPLICATE KEY UPDATE IsDeleted = '';

-- Add colors commonly used for footwear
INSERT INTO Color (Color, IsDeleted) VALUES 
('Black', ''),
('White', ''),
('Navy Blue', ''),
('Gray', ''),
('Red', ''),
('Blue', ''),
('Brown', ''),
('Beige', ''),
('Green', ''),
('Multi-color', '')
ON DUPLICATE KEY UPDATE IsDeleted = '';

-- Add standard footwear sizes
INSERT INTO Size (Size, IsDeleted) VALUES 
('UK 6', ''),
('UK 7', ''),
('UK 8', ''),
('UK 9', ''),
('UK 10', ''),
('UK 11', ''),
('UK 12', ''),
('EU 39', ''),
('EU 40', ''),
('EU 41', ''),
('EU 42', ''),
('EU 43', ''),
('EU 44', ''),
('EU 45', '')
ON DUPLICATE KEY UPDATE IsDeleted = '';

-- Add materials commonly used in footwear
INSERT INTO Material (Material, IsDeleted) VALUES 
('Leather', ''),
('Canvas', ''),
('Mesh', ''),
('Synthetic', ''),
('Suede', ''),
('Rubber', ''),
('Textile', ''),
('Knit', ''),
('Gore-Tex', ''),
('Patent Leather', '')
ON DUPLICATE KEY UPDATE IsDeleted = '';

-- Add standard shapes for footwear
INSERT INTO Shape (Shape, IsDeleted) VALUES 
('Regular', ''),
('Wide', ''),
('Narrow', '')
ON DUPLICATE KEY UPDATE IsDeleted = '';
