const { getGmailService } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { Base64 } = require('js-base64');

/**
 * Email Service - Handles all interactions with Gmail API
 */
class EmailService {
  constructor(auth) {
    this.gmail = getGmailService(auth);
    this.userId = 'me';
  }

  /**
   * List emails with optional filters
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} - List of emails
   */
  async listEmails(options = {}) {
    try {
      const { maxResults = 20, labelIds = [], q = '' } = options;
      
      const response = await this.gmail.users.messages.list({
        userId: this.userId,
        maxResults,
        labelIds,
        q
      });
      
      const messages = response.data.messages || [];
      
      // Get full message details for each email
      const emails = await Promise.all(
        messages.map(message => this.getEmail(message.id))
      );
      
      return emails;
    } catch (error) {
      logger.error('Error listing emails:', error);
      throw new Error('Failed to list emails: ' + error.message);
    }
  }

  /**
   * Get a specific email by ID
   * @param {string} id - Email ID
   * @returns {Promise<Object>} - Email details
   */
  async getEmail(id) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: this.userId,
        id,
        format: 'full'
      });
      
      const message = response.data;
      const headers = message.payload.headers;
      
      // Extract common headers
      const getHeader = (name) => {
        const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
        return header ? header.value : '';
      };
      
      // Parse email body
      const parts = message.payload.parts || [];
      let body = '';
      
      // Try to find HTML part first, then plain text
      const htmlPart = parts.find(part => part.mimeType === 'text/html');
      const textPart = parts.find(part => part.mimeType === 'text/plain');
      
      if (htmlPart && htmlPart.body && htmlPart.body.data) {
        body = Base64.decode(htmlPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (textPart && textPart.body && textPart.body.data) {
        body = Base64.decode(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (message.payload.body && message.payload.body.data) {
        // Some messages don't have parts
        body = Base64.decode(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
      
      return {
        id: message.id,
        threadId: message.threadId,
        labelIds: message.labelIds || [],
        snippet: message.snippet,
        historyId: message.historyId,
        internalDate: message.internalDate,
        subject: getHeader('subject'),
        from: getHeader('from'),
        to: getHeader('to'),
        date: getHeader('date'),
        body,
        isUnread: message.labelIds && message.labelIds.includes('UNREAD')
      };
    } catch (error) {
      logger.error(`Error getting email ${id}:`, error);
      throw new Error(`Failed to get email ${id}: ${error.message}`);
    }
  }

  /**
   * Send an email
   * @param {Object} emailData - Email data
   * @returns {Promise<Object>} - Send response
   */
  async sendEmail(emailData) {
    try {
      const { to, subject, body, cc, bcc, attachments = [] } = emailData;
      
      // Create email content
      let email = [
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `To: ${to}`,
        `Subject: ${subject}`
      ];
      
      if (cc) email.push(`Cc: ${cc}`);
      if (bcc) email.push(`Bcc: ${bcc}`);
      
      email.push('', body);
      
      // Encode the email
      const encodedEmail = Base64.encode(email.join('\r\n'))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      // Send the email
      const response = await this.gmail.users.messages.send({
        userId: this.userId,
        requestBody: {
          raw: encodedEmail
        }
      });
      
      logger.info(`Email sent successfully: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw new Error('Failed to send email: ' + error.message);
    }
  }

  /**
   * Modify the labels of an email
   * @param {string} id - Email ID
   * @param {string[]} addLabelIds - Labels to add
   * @param {string[]} removeLabelIds - Labels to remove
   * @returns {Promise<Object>} - Modified message
   */
  async modifyLabels(id, addLabelIds = [], removeLabelIds = []) {
    try {
      const response = await this.gmail.users.messages.modify({
        userId: this.userId,
        id,
        requestBody: {
          addLabelIds,
          removeLabelIds
        }
      });
      
      return response.data;
    } catch (error) {
      logger.error(`Error modifying labels for email ${id}:`, error);
      throw new Error(`Failed to modify labels for email ${id}: ${error.message}`);
    }
  }

  /**
   * Mark email as read
   * @param {string} id - Email ID
   * @returns {Promise<Object>} - Modified message
   */
  async markAsRead(id) {
    return this.modifyLabels(id, [], ['UNREAD']);
  }

  /**
   * Mark email as unread
   * @param {string} id - Email ID
   * @returns {Promise<Object>} - Modified message
   */
  async markAsUnread(id) {
    return this.modifyLabels(id, ['UNREAD'], []);
  }

  /**
   * Archive an email
   * @param {string} id - Email ID
   * @returns {Promise<Object>} - Modified message
   */
  async archiveEmail(id) {
    return this.modifyLabels(id, [], ['INBOX']);
  }

  /**
   * Trash an email
   * @param {string} id - Email ID
   * @returns {Promise<Object>} - Trashed message
   */
  async trashEmail(id) {
    try {
      const response = await this.gmail.users.messages.trash({
        userId: this.userId,
        id
      });
      
      return response.data;
    } catch (error) {
      logger.error(`Error trashing email ${id}:`, error);
      throw new Error(`Failed to trash email ${id}: ${error.message}`);
    }
  }

  /**
   * Get all labels
   * @returns {Promise<Array>} - List of labels
   */
  async getLabels() {
    try {
      const response = await this.gmail.users.labels.list({
        userId: this.userId
      });
      
      return response.data.labels || [];
    } catch (error) {
      logger.error('Error getting labels:', error);
      throw new Error('Failed to get labels: ' + error.message);
    }
  }

  /**
   * Create a new label
   * @param {string} name - Label name
   * @returns {Promise<Object>} - Created label
   */
  async createLabel(name) {
    try {
      const response = await this.gmail.users.labels.create({
        userId: this.userId,
        requestBody: {
          name,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show'
        }
      });
      
      return response.data;
    } catch (error) {
      logger.error(`Error creating label ${name}:`, error);
      throw new Error(`Failed to create label ${name}: ${error.message}`);
    }
  }
}

module.exports = EmailService;