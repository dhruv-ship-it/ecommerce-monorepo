import { db } from '../index.js';

export class RecommendationService {
  /**
   * Generate product recommendations based on customer's purchase history
   * @param {number} customerId - The customer ID
   * @param {number} productId - The product ID that was just purchased
   * @returns {Promise<Array>} Array of recommended products
   */
  async getRecommendations(customerId, productId) {
    console.log(`RECOMMENDATION DEBUG: Starting recommendation generation for customer ${customerId}, product ${productId}`);
    try {
      const conn = await db.getConnection();
      
      // Get the category of the purchased product
      const productQuery = `
        SELECT p.ProductCategory_Gen, p.ProductSubCategory, p.Model
        FROM product p
        WHERE p.ProductId = ?
      `;
      
      const productResult = await conn.query(productQuery, [productId]);
      let productDetails = [];
      if (Array.isArray(productResult)) {
        if (Array.isArray(productResult[0])) {
          productDetails = productResult[0];
        } else {
          productDetails = productResult;
        }
      }
      
      if (!productDetails || productDetails.length === 0) {
        console.log(`RECOMMENDATION DEBUG: No product details found for product ID ${productId}`);
        conn.release();
        return [];
      }
      console.log(`RECOMMENDATION DEBUG: Found product details for ${productId}:`, productDetails[0]);
      
      const product = productDetails[0];
      const categoryId = product.ProductCategory_Gen;
      const subcategoryId = product.ProductSubCategory;
      const modelId = product.Model;
      
      // Get customer's purchase history for collaborative filtering
      const historyQuery = `
        SELECT DISTINCT p2.ProductId, p2.Product, p2.MRP, p2.ProductCategory_Gen, p2.ProductSubCategory, p2.Model
        FROM purchase pu1
        JOIN purchase pu2 ON pu1.CustomerId = pu2.CustomerId
        JOIN product p2 ON pu2.ProductId = p2.ProductId
        WHERE pu1.CustomerId = ? AND pu2.ProductId != ?
        ORDER BY pu2.OrderDate DESC
        LIMIT 10
      `;
      
      const historyResult = await conn.query(historyQuery, [customerId, productId]);
      let customerHistory = [];
      if (Array.isArray(historyResult)) {
        if (Array.isArray(historyResult[0])) {
          customerHistory = historyResult[0];
        } else {
          customerHistory = historyResult;
        }
      }
      
      // Get products in the same category
      const categoryQuery = `
        SELECT p.ProductId, p.Product, p.MRP, p.ProductCategory_Gen, p.ProductSubCategory, p.Model
        FROM product p
        WHERE p.ProductCategory_Gen = ? AND p.ProductId != ?
        ORDER BY RAND()
        LIMIT 5
      `;
      
      const categoryResult = await conn.query(categoryQuery, [categoryId, productId]);
      let categoryProducts = [];
      if (Array.isArray(categoryResult)) {
        if (Array.isArray(categoryResult[0])) {
          categoryProducts = categoryResult[0];
        } else {
          categoryProducts = categoryResult;
        }
      }
      
      // Get popular products in the same category
      const popularQuery = `
        SELECT p.ProductId, p.Product, p.MRP, p.ProductCategory_Gen, p.ProductSubCategory, p.Model, COUNT(*) as purchase_count
        FROM purchase pur
        JOIN product p ON pur.ProductId = p.ProductId
        WHERE p.ProductCategory_Gen = ?
        GROUP BY p.ProductId
        ORDER BY purchase_count DESC
        LIMIT 5
      `;
      
      const popularResult = await conn.query(popularQuery, [categoryId]);
      let popularProducts = [];
      if (Array.isArray(popularResult)) {
        if (Array.isArray(popularResult[0])) {
          popularProducts = popularResult[0];
        } else {
          popularProducts = popularResult;
        }
      }
      
      // Combine and deduplicate recommendations
      const allRecommendations = [...categoryProducts, ...popularProducts];
      const seenProducts = new Set();
      const uniqueRecommendations = [];
      
      for (const product of allRecommendations) {
        if (!seenProducts.has(product.ProductId)) {
          seenProducts.add(product.ProductId);
          uniqueRecommendations.push({
            productId: product.ProductId,
            modelId: product.Model, // Include model ID for proper linking
            productName: product.Product,
            price: parseFloat(product.MRP) || 0,
            category: await this.getCategoryName(conn, product.ProductCategory_Gen),
            subcategory: await this.getSubcategoryName(conn, product.ProductSubCategory),
            score: Math.random(), // Simple random score for now
            reason: 'Category-based recommendation'
          });
        }
      }
      
      conn.release();
      
      // Return top 3 recommendations
      console.log(`RECOMMENDATION DEBUG: Returning ${uniqueRecommendations.length} recommendations:`, uniqueRecommendations.slice(0, 3));
      return uniqueRecommendations.slice(0, 3);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }
  
  /**
   * Get category name by ID
   */
  async getCategoryName(conn, categoryId) {
    try {
      const categoryQuery = `
        SELECT ProductCategory
        FROM productcategory
        WHERE ProductCategoryId = ?
      `;
      
      const categoryResult = await conn.query(categoryQuery, [categoryId]);
      let categoryDetails = [];
      if (Array.isArray(categoryResult)) {
        if (Array.isArray(categoryResult[0])) {
          categoryDetails = categoryResult[0];
        } else {
          categoryDetails = categoryResult;
        }
      }
      
      return categoryDetails && categoryDetails.length > 0 ? categoryDetails[0].ProductCategory : 'Unknown';
    } catch (error) {
      console.error('Error getting category name:', error);
      return 'Unknown';
    }
  }
  
  /**
   * Get subcategory name by ID
   */
  async getSubcategoryName(conn, subcategoryId) {
    try {
      const subcategoryQuery = `
        SELECT ProductSubCategory
        FROM productsubcategory
        WHERE ProductSubCategoryId = ?
      `;
      
      const subcategoryResult = await conn.query(subcategoryQuery, [subcategoryId]);
      let subcategoryDetails = [];
      if (Array.isArray(subcategoryResult)) {
        if (Array.isArray(subcategoryResult[0])) {
          subcategoryDetails = subcategoryResult[0];
        } else {
          subcategoryDetails = subcategoryResult;
        }
      }
      
      return subcategoryDetails && subcategoryDetails.length > 0 ? subcategoryDetails[0].ProductSubCategory : 'Unknown';
    } catch (error) {
      console.error('Error getting subcategory name:', error);
      return 'Unknown';
    }
  }
}

export const recommendationService = new RecommendationService();