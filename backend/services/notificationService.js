import { db } from '../index.js';

export class NotificationService {
  /**
   * Create notification for user (vendor/courier) or customer
   * @param {Object} options
   * @param {number} options.recipientId - UserId for vendors/couriers or CustomerId for customers
   * @param {string} options.recipientType - 'user' or 'customer'
   * @param {string} options.type - Notification type (Order, Status, etc.)
   * @param {string} options.message - Notification message
   * @returns {Promise<boolean>} Success status
   */
  async createNotification({ recipientId, recipientType, type, message }) {
    try {
      const conn = await db.getConnection();
      
      // Validate inputs
      if (!recipientId || !recipientType || !type || !message) {
        throw new Error('Missing required notification parameters');
      }
      
      // Determine which table to use based on recipient type
      const tableName = recipientType === 'user' ? 'notification_user' : 'notification_customer';
      const idColumn = recipientType === 'user' ? 'UserId' : 'CustomerId';
      
      console.log(`NOTIFICATION DEBUG: Creating ${recipientType} notification for ID ${recipientId}`);
      console.log(`NOTIFICATION DEBUG: Table: ${tableName}, Type: ${type}, Message: ${message}`);
      
      // Insert notification
      const query = `
        INSERT INTO ${tableName} 
        (${idColumn}, Type, Message, IsRead, RecordCreationTimeStamp) 
        VALUES (?, ?, ?, 'N', NOW())
      `;
      
      await conn.query(query, [recipientId, type, message]);
      conn.release();
      
      console.log(`NOTIFICATION DEBUG: Successfully created ${recipientType} notification`);
      return true;
    } catch (error) {
      console.error('Error creating notification:', error);
      return false;
    }
  }
  
  /**
   * Create multiple notifications in batch
   * @param {Array} notifications - Array of notification objects
   * @returns {Promise<Array>} Array of success statuses
   */
  async createNotifications(notifications) {
    const results = [];
    for (const notification of notifications) {
      const success = await this.createNotification(notification);
      results.push(success);
    }
    return results;
  }
  
  /**
   * Get unread notification count for user or customer
   * @param {number} recipientId
   * @param {string} recipientType - 'user' or 'customer'
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount(recipientId, recipientType) {
    try {
      const conn = await db.getConnection();
      
      const tableName = recipientType === 'user' ? 'notification_user' : 'notification_customer';
      const idColumn = recipientType === 'user' ? 'UserId' : 'CustomerId';
      
      const query = `SELECT COUNT(*) as count FROM ${tableName} WHERE ${idColumn} = ? AND IsRead = 'N'`;
      const result = await conn.query(query, [recipientId]);
      
      conn.release();
      
      // Handle MariaDB result format
      let countResult = [];
      if (Array.isArray(result)) {
        if (Array.isArray(result[0])) {
          countResult = result[0];
        } else {
          countResult = result;
        }
      }
      
      return countResult && countResult.length > 0 ? parseInt(countResult[0].count) : 0;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }
  
  /**
   * Mark notification as read
   * @param {number} notificationId
   * @param {string} recipientType - 'user' or 'customer'
   * @returns {Promise<boolean>} Success status
   */
  async markAsRead(notificationId, recipientType) {
    try {
      const conn = await db.getConnection();
      
      const tableName = recipientType === 'user' ? 'notification_user' : 'notification_customer';
      
      const query = `UPDATE ${tableName} SET IsRead = 'Y' WHERE NotificationId = ?`;
      await conn.query(query, [notificationId]);
      conn.release();
      
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }
}

export const notificationService = new NotificationService();