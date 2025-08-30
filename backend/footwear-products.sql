-- Create and populate footwear products
-- Run this after footwear-setup.sql

-- First, add footwear models
INSERT INTO Model (
    Model,
    Brand,
    IsDeleted,
    RecordCreationLogin,
    LastUpdationLogin
) VALUES 
-- Nike Models
('Nike Air Max 270', (SELECT BrandId FROM Brand WHERE Brand = 'Nike'), '', 'ADMIN', 'ADMIN'),
('Nike Air Zoom Pegasus', (SELECT BrandId FROM Brand WHERE Brand = 'Nike'), '', 'ADMIN', 'ADMIN'),
('Nike Revolution 6', (SELECT BrandId FROM Brand WHERE Brand = 'Nike'), '', 'ADMIN', 'ADMIN'),

-- Adidas Models
('Adidas Ultraboost 22', (SELECT BrandId FROM Brand WHERE Brand = 'Adidas'), '', 'ADMIN', 'ADMIN'),
('Adidas Superstar', (SELECT BrandId FROM Brand WHERE Brand = 'Adidas'), '', 'ADMIN', 'ADMIN'),
('Adidas Stan Smith', (SELECT BrandId FROM Brand WHERE Brand = 'Adidas'), '', 'ADMIN', 'ADMIN'),

-- Puma Models
('Puma RS-X', (SELECT BrandId FROM Brand WHERE Brand = 'Puma'), '', 'ADMIN', 'ADMIN'),
('Puma Suede Classic', (SELECT BrandId FROM Brand WHERE Brand = 'Puma'), '', 'ADMIN', 'ADMIN'),

-- Other Brand Models
('Reebok Classic Leather', (SELECT BrandId FROM Brand WHERE Brand = 'Reebok'), '', 'ADMIN', 'ADMIN'),
('Converse Chuck Taylor', (SELECT BrandId FROM Brand WHERE Brand = 'Converse'), '', 'ADMIN', 'ADMIN');

-- Now add the products
INSERT INTO Product (
    Product,
    ProductCategory_Gen,
    ProductSubCategory,
    Model,
    Quantity,
    Unit,
    MRP,
    Currency,
    Color,
    Size,
    Shape,
    IsDeleted,
    RecordCreationLogin,
    LastUpdationLogin
) VALUES 
-- Nike Air Max 270
(
    'Nike Air Max 270 - Black/White',
    (SELECT ProductCategoryId FROM ProductCategory WHERE ProductCategory = 'Footwear'),
    (SELECT ProductSubCategoryId FROM ProductSubCategory WHERE ProductSubCategory = 'Running Shoes'),
    (SELECT ModelId FROM Model WHERE Model = 'Nike Air Max 270'),
    50,
    (SELECT UnitId FROM Unit WHERE Unit = 'Pair'),
    12999.00,
    (SELECT CurrencyId FROM Currency WHERE Currency = 'INR'),
    (SELECT ColorId FROM Color WHERE Color = 'Black'),
    (SELECT SizeId FROM Size WHERE Size = 'UK 9'),
    (SELECT ShapeId FROM Shape WHERE Shape = 'Regular'),
    '',
    'ADMIN',
    'ADMIN'
),

-- Adidas Ultraboost 22
(
    'Adidas Ultraboost 22 - White/Gray',
    (SELECT ProductCategoryId FROM ProductCategory WHERE ProductCategory = 'Footwear'),
    (SELECT ProductSubCategoryId FROM ProductSubCategory WHERE ProductSubCategory = 'Running Shoes'),
    (SELECT ModelId FROM Model WHERE Model = 'Adidas Ultraboost 22'),
    40,
    (SELECT UnitId FROM Unit WHERE Unit = 'Pair'),
    15999.00,
    (SELECT CurrencyId FROM Currency WHERE Currency = 'INR'),
    (SELECT ColorId FROM Color WHERE Color = 'White'),
    (SELECT SizeId FROM Size WHERE Size = 'UK 8'),
    (SELECT ShapeId FROM Shape WHERE Shape = 'Regular'),
    '',
    'ADMIN',
    'ADMIN'
),

-- Puma RS-X
(
    'Puma RS-X - Blue/Red',
    (SELECT ProductCategoryId FROM ProductCategory WHERE ProductCategory = 'Footwear'),
    (SELECT ProductSubCategoryId FROM ProductSubCategory WHERE ProductSubCategory = 'Sneakers'),
    (SELECT ModelId FROM Model WHERE Model = 'Puma RS-X'),
    30,
    (SELECT UnitId FROM Unit WHERE Unit = 'Pair'),
    8999.00,
    (SELECT CurrencyId FROM Currency WHERE Currency = 'INR'),
    (SELECT ColorId FROM Color WHERE Color = 'Blue'),
    (SELECT SizeId FROM Size WHERE Size = 'UK 10'),
    (SELECT ShapeId FROM Shape WHERE Shape = 'Regular'),
    '',
    'ADMIN',
    'ADMIN'
),

-- Converse Chuck Taylor
(
    'Converse Chuck Taylor - Classic Black',
    (SELECT ProductCategoryId FROM ProductCategory WHERE ProductCategory = 'Footwear'),
    (SELECT ProductSubCategoryId FROM ProductSubCategory WHERE ProductSubCategory = 'Casual Shoes'),
    (SELECT ModelId FROM Model WHERE Model = 'Converse Chuck Taylor'),
    60,
    (SELECT UnitId FROM Unit WHERE Unit = 'Pair'),
    4999.00,
    (SELECT CurrencyId FROM Currency WHERE Currency = 'INR'),
    (SELECT ColorId FROM Color WHERE Color = 'Black'),
    (SELECT SizeId FROM Size WHERE Size = 'UK 8'),
    (SELECT ShapeId FROM Shape WHERE Shape = 'Regular'),
    '',
    'ADMIN',
    'ADMIN'
);
