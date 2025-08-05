/**
 * Notification Service
 * Handles in-app notifications and external notifications
 */

const { safeDebugLog, safeDebugError } = require('../../shared/utils/errorHandler');
const { getDb } = require('../../shared/config/firebaseConfig');
const emailService = require('./emailService');

class NotificationService {
  constructor() {
    this.db = getDb();
  }

  /**
   * Send notification to user(s)
   */
  async sendNotification(userId, notification) {
    try {
      const notificationData = {
        ...notification,
        id: this.generateNotificationId(),
        createdAt: new Date(),
        read: false,
        readAt: null
      };

      // Store in Firestore
      await this.db
        .collection('notifications')
        .doc(userId)
        .collection('items')
        .doc(notificationData.id)
        .set(notificationData);

      safeDebugLog('Notification sent', {
        userId,
        notificationId: notificationData.id,
        type: notification.type,
        title: notification.title
      });

      return notificationData;
    } catch (error) {
      safeDebugError('Error sending notification', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendBulkNotification(userIds, notification) {
    const results = [];
    
    for (const userId of userIds) {
      try {
        const result = await this.sendNotification(userId, notification);
        results.push({ userId, success: true, notificationId: result.id });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Notify staff of new inquiry
   */
  async notifyNewInquiry(inquiryData) {
    try {
      // Get all admin and manager users
      const staffQuery = await this.db
        .collection('users')
        .where('role', 'in', ['admin', 'manager'])
        .where('status', '==', 'active')
        .get();

      const staffUsers = staffQuery.docs.map(doc => doc.data());

      const notification = {
        type: 'new_inquiry',
        title: 'New Customer Inquiry',
        message: `New inquiry from ${inquiryData.name} - ${inquiryData.subject}`,
        priority: inquiryData.urgency || 'medium',
        data: {
          inquiryId: inquiryData.id,
          referenceNumber: inquiryData.referenceNumber,
          customerName: inquiryData.name,
          customerEmail: inquiryData.email,
          subject: inquiryData.subject,
          urgency: inquiryData.urgency
        },
        actions: [
          {
            type: 'view',
            label: 'View Inquiry',
            url: `/admin/inquiries/${inquiryData.id}`
          },
          {
            type: 'assign',
            label: 'Assign to Me',
            action: 'assign_inquiry'
          }
        ]
      };

      // Send notifications to all staff
      const userIds = staffUsers.map(user => user.uid);
      await this.sendBulkNotification(userIds, notification);

      // Send email notifications for urgent inquiries
      if (inquiryData.urgency === 'urgent') {
        for (const user of staffUsers) {
          try {
            await emailService.sendTemplatedEmail(
              'urgent-inquiry-notification',
              user.email,
              {
                staffName: user.name,
                customerName: inquiryData.name,
                subject: inquiryData.subject,
                referenceNumber: inquiryData.referenceNumber,
                inquiryUrl: `https://foamfighters.co.uk/admin/inquiries/${inquiryData.id}`
              },
              'high'
            );
          } catch (emailError) {
            safeDebugError('Failed to send urgent inquiry email', emailError);
          }
        }
      }

      safeDebugLog('Staff notified of new inquiry', {
        inquiryId: inquiryData.id,
        referenceNumber: inquiryData.referenceNumber,
        notifiedStaff: userIds.length,
        urgency: inquiryData.urgency
      });

    } catch (error) {
      safeDebugError('Error notifying staff of new inquiry', error);
      throw error;
    }
  }

  /**
   * Notify customer of quote ready
   */
  async notifyQuoteReady(quoteData) {
    try {
      const notification = {
        type: 'quote_ready',
        title: 'Your Quote is Ready',
        message: `Your spray foam removal quote (${quoteData.quoteNumber}) is ready for review`,
        priority: 'medium',
        data: {
          quoteId: quoteData.id,
          quoteNumber: quoteData.quoteNumber,
          totalAmount: quoteData.totalAmount,
          customerName: quoteData.customerInfo.name
        },
        actions: [
          {
            type: 'view',
            label: 'View Quote',
            url: `/quote/${quoteData.id}`
          },
          {
            type: 'accept',
            label: 'Accept Quote',
            action: 'accept_quote'
          }
        ]
      };

      // This would typically be sent to a customer user account
      // For now, we'll just log it as the customer notification system
      // would be part of a customer portal
      
      safeDebugLog('Customer quote notification prepared', {
        quoteId: quoteData.id,
        quoteNumber: quoteData.quoteNumber,
        customerEmail: quoteData.customerInfo.email
      });

    } catch (error) {
      safeDebugError('Error preparing quote notification', error);
      throw error;
    }
  }

  /**
   * Notify technician of project assignment
   */
  async notifyProjectAssignment(projectData, technicianId) {
    try {
      const notification = {
        type: 'project_assigned',
        title: 'New Project Assigned',
        message: `You have been assigned to project: ${projectData.projectDetails.title}`,
        priority: 'high',
        data: {
          projectId: projectData.id,
          projectNumber: projectData.projectNumber,
          projectTitle: projectData.projectDetails.title,
          scheduledDate: projectData.scheduledDate,
          customerName: projectData.customerInfo.name,
          address: projectData.propertyDetails.address
        },
        actions: [
          {
            type: 'view',
            label: 'View Project',
            url: `/admin/projects/${projectData.id}`
          },
          {
            type: 'accept',
            label: 'Acknowledge',
            action: 'acknowledge_assignment'
          }
        ]
      };

      await this.sendNotification(technicianId, notification);

      // Get technician details for email
      const techDoc = await this.db.collection('users').doc(technicianId).get();
      if (techDoc.exists) {
        const techData = techDoc.data();
        
        try {
          await emailService.sendTemplatedEmail(
            'project-assignment',
            techData.email,
            {
              technicianName: techData.name,
              projectTitle: projectData.projectDetails.title,
              projectNumber: projectData.projectNumber,
              scheduledDate: projectData.scheduledDate.toLocaleDateString('en-GB'),
              customerName: projectData.customerInfo.name,
              address: projectData.propertyDetails.address,
              projectUrl: `https://foamfighters.co.uk/admin/projects/${projectData.id}`
            }
          );
        } catch (emailError) {
          safeDebugError('Failed to send project assignment email', emailError);
        }
      }

      safeDebugLog('Technician notified of project assignment', {
        projectId: projectData.id,
        projectNumber: projectData.projectNumber,
        technicianId,
        scheduledDate: projectData.scheduledDate
      });

    } catch (error) {
      safeDebugError('Error notifying technician of assignment', error);
      throw error;
    }
  }

  /**
   * Notify of project status change
   */
  async notifyProjectStatusChange(projectData, oldStatus, newStatus, changedBy) {
    try {
      // Notify assigned technician if status changed
      if (projectData.assignedTechnician && projectData.assignedTechnician !== changedBy) {
        const notification = {
          type: 'project_status_changed',
          title: 'Project Status Updated',
          message: `Project ${projectData.projectNumber} status changed from ${oldStatus} to ${newStatus}`,
          priority: 'medium',
          data: {
            projectId: projectData.id,
            projectNumber: projectData.projectNumber,
            oldStatus,
            newStatus,
            changedBy
          },
          actions: [
            {
              type: 'view',
              label: 'View Project',
              url: `/admin/projects/${projectData.id}`
            }
          ]
        };

        await this.sendNotification(projectData.assignedTechnician, notification);
      }

      // Notify managers of important status changes
      if (['completed', 'cancelled', 'on-hold'].includes(newStatus)) {
        const managersQuery = await this.db
          .collection('users')
          .where('role', 'in', ['admin', 'manager'])
          .where('status', '==', 'active')
          .get();

        const managers = managersQuery.docs.map(doc => doc.data());
        const managerIds = managers.map(manager => manager.uid);

        const notification = {
          type: 'project_status_important',
          title: `Project ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
          message: `Project ${projectData.projectNumber} has been marked as ${newStatus}`,
          priority: newStatus === 'cancelled' ? 'high' : 'medium',
          data: {
            projectId: projectData.id,
            projectNumber: projectData.projectNumber,
            newStatus,
            customerName: projectData.customerInfo.name
          },
          actions: [
            {
              type: 'view',
              label: 'View Project',
              url: `/admin/projects/${projectData.id}`
            }
          ]
        };

        await this.sendBulkNotification(managerIds, notification);
      }

      safeDebugLog('Project status change notifications sent', {
        projectId: projectData.id,
        oldStatus,
        newStatus,
        changedBy
      });

    } catch (error) {
      safeDebugError('Error sending project status notifications', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId, notificationId) {
    try {
      await this.db
        .collection('notifications')
        .doc(userId)
        .collection('items')
        .doc(notificationId)
        .update({
          read: true,
          readAt: new Date()
        });

      safeDebugLog('Notification marked as read', {
        userId,
        notificationId
      });

    } catch (error) {
      safeDebugError('Error marking notification as read', error);
      throw error;
    }
  }

  /**
   * Get notifications for user
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        limit = 50,
        includeRead = true,
        type = null
      } = options;

      let query = this.db
        .collection('notifications')
        .doc(userId)
        .collection('items')
        .orderBy('createdAt', 'desc')
        .limit(limit);

      if (!includeRead) {
        query = query.where('read', '==', false);
      }

      if (type) {
        query = query.where('type', '==', type);
      }

      const snapshot = await query.get();
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return notifications;

    } catch (error) {
      safeDebugError('Error getting user notifications', error);
      throw error;
    }
  }

  /**
   * Get notification counts for user
   */
  async getNotificationCounts(userId) {
    try {
      const [unreadSnapshot, totalSnapshot] = await Promise.all([
        this.db
          .collection('notifications')
          .doc(userId)
          .collection('items')
          .where('read', '==', false)
          .get(),
        this.db
          .collection('notifications')
          .doc(userId)
          .collection('items')
          .get()
      ]);

      return {
        unread: unreadSnapshot.size,
        total: totalSnapshot.size
      };

    } catch (error) {
      safeDebugError('Error getting notification counts', error);
      throw error;
    }
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // This would typically be run as a scheduled function
      // Get all users and clean their old notifications
      const usersSnapshot = await this.db.collection('users').get();
      let cleanedCount = 0;

      for (const userDoc of usersSnapshot.docs) {
        const oldNotificationsQuery = await this.db
          .collection('notifications')
          .doc(userDoc.id)
          .collection('items')
          .where('createdAt', '<', cutoffDate)
          .where('read', '==', true) // Only delete read notifications
          .get();

        for (const notificationDoc of oldNotificationsQuery.docs) {
          await notificationDoc.ref.delete();
          cleanedCount++;
        }
      }

      safeDebugLog('Old notifications cleaned up', {
        cleanedCount,
        daysOld
      });

      return cleanedCount;

    } catch (error) {
      safeDebugError('Error cleaning up old notifications', error);
      throw error;
    }
  }

  /**
   * Generate unique notification ID
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;