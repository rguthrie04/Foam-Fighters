/**
 * Email Service
 * Templated email system with multiple providers and robust error handling
 */

const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

// Register Handlebars helpers
handlebars.registerHelper('eq', function (a, b) {
    return a === b;
});

// Import utilities - simplified for Firebase Functions
function safeDebugLog(message, data = {}) {
  console.log(`[DEBUG] ${message}`, data);
}

function safeDebugError(message, error = {}) {
  console.error(`[ERROR] ${message}`, error);
}

function safeDebugWarn(message, data = {}) {
  console.warn(`[WARN] ${message}`, data);
}

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    this.initialized = false;
    
    // Don't initialize on startup - lazy load when first used
  }

  /**
   * Ensure service is initialized before use (lazy initialization)
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeService();
    }
  }

  /**
   * Initialize email service with transporter and templates
   */
  async initializeService() {
    try {
      await this.setupTransporter();
      await this.loadTemplates();
      this.initialized = true;
      
      safeDebugLog('Email service initialized successfully');
    } catch (error) {
      safeDebugError('Failed to initialize email service', error);
    }
  }

  /**
   * Setup email transporter based on environment
   */
  async setupTransporter() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      // Use ethereal for development testing
      try {
        const testAccount = await nodemailer.createTestAccount();
        
        this.transporter = nodemailer.createTransporter({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        
        safeDebugLog('Development email transporter created', {
          host: 'smtp.ethereal.email',
          user: testAccount.user
        });
      } catch (error) {
        safeDebugWarn('Failed to create ethereal account, using console transport');
        this.transporter = this.createConsoleTransporter();
      }
    } else {
      // Production email setup using Firebase config
      const functions = require('firebase-functions');
      const config = functions.config();
      
      this.transporter = nodemailer.createTransport({
        host: config.smtp?.host || 'smtppro.zoho.com',
        port: parseInt(config.smtp?.port || '465'),
        secure: config.smtp?.secure === 'true' || true, // SSL for port 465
        auth: {
          user: config.smtp?.user || 'notifications@foamfighters.uk',
          pass: config.smtp?.password
        }
      });
    }

    // Verify transporter
    if (this.transporter.verify) {
      await this.transporter.verify();
      safeDebugLog('Email transporter verified successfully');
    }
  }

  /**
   * Create a console-only transporter for fallback
   */
  createConsoleTransporter() {
    return {
      sendMail: async (mailOptions) => {
        safeDebugLog('Email would be sent (console mode)', {
          to: mailOptions.to,
          subject: mailOptions.subject,
          text: mailOptions.text?.substring(0, 200) + '...'
        });
        
        return {
          messageId: 'console-' + Date.now(),
          accepted: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
          rejected: []
        };
      }
    };
  }

  /**
   * Load email templates from disk
   */
  async loadTemplates() {
    const templatesDir = path.join(__dirname, '../templates');
    
    try {
      // Ensure templates directory exists
      await fs.mkdir(templatesDir, { recursive: true });
      
      const templateFiles = [
        'inquiry-confirmation.hbs',
        'quote-email.hbs',
        'project-update.hbs',
        'welcome-email.hbs',
        'password-reset.hbs'
      ];

      for (const templateFile of templateFiles) {
        const templatePath = path.join(templatesDir, templateFile);
        
        try {
          const templateContent = await fs.readFile(templatePath, 'utf8');
          const templateName = templateFile.replace('.hbs', '');
          this.templates.set(templateName, handlebars.compile(templateContent));
          
          safeDebugLog(`Template loaded: ${templateName}`);
        } catch (error) {
          // Create default template if file doesn't exist
          if (error.code === 'ENOENT') {
            await this.createDefaultTemplate(templatePath, templateFile);
            
            // Try loading again
            const templateContent = await fs.readFile(templatePath, 'utf8');
            const templateName = templateFile.replace('.hbs', '');
            this.templates.set(templateName, handlebars.compile(templateContent));
            
            safeDebugLog(`Default template created and loaded: ${templateName}`);
          } else {
            safeDebugError(`Failed to load template: ${templateFile}`, error);
          }
        }
      }
    } catch (error) {
      safeDebugError('Failed to load email templates', error);
    }
  }

  /**
   * Create default email templates
   */
  async createDefaultTemplate(templatePath, templateFile) {
    const templates = {
      'inquiry-confirmation.hbs': `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Inquiry Confirmation - Foam Fighters</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c5aa0;">Foam Fighters</h1>
            <p style="color: #666;">Professional Spray Foam Removal Services</p>
        </div>
        
        <h2>Thank you for your inquiry, {{customerName}}!</h2>
        
        <p>We have received your inquiry and will respond within {{responseTime}}. Here are the details we received:</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Reference Number:</strong> {{referenceNumber}}</p>
            <p><strong>Subject:</strong> {{subject}}</p>
            <p><strong>Submitted:</strong> {{submittedAt}}</p>
            {{#if urgency}}<p><strong>Priority:</strong> {{urgency}}</p>{{/if}}
        </div>
        
        <h3>What happens next?</h3>
        <ul>
            <li>One of our experts will review your inquiry</li>
            <li>We'll contact you within {{responseTime}} to discuss your requirements</li>
            <li>If needed, we can arrange a site survey</li>
            <li>You'll receive a detailed quote for the work</li>
        </ul>
        
        <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Need immediate assistance?</strong></p>
            <p>Call us on: <strong>0333 577 0132</strong></p>
        </div>
        
        <p>Best regards,<br>The Foam Fighters Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
            Foam Fighters Ltd | Company Registration: 16612986<br>
            This email was sent in response to your inquiry on our website.
        </p>
    </div>
</body>
</html>`,

      'quote-email.hbs': `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Your Spray Foam Removal Quote - Foam Fighters</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c5aa0;">Foam Fighters</h1>
            <p style="color: #666;">Professional Spray Foam Removal Services</p>
        </div>
        
        <h2>Your Quote is Ready, {{customerName}}!</h2>
        
        <p>Thank you for choosing Foam Fighters. We're pleased to provide you with a detailed quote for spray foam removal at {{propertyAddress}}.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Quote Number:</strong> {{quoteNumber}}</p>
            <p><strong>Total Amount:</strong> £{{totalAmount}}</p>
            <p><strong>Valid Until:</strong> {{expiresAt}}</p>
            <p><strong>Estimated Area:</strong> {{estimatedArea}} m²</p>
        </div>
        
        {{#if customMessage}}
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Personal Message:</strong></p>
            <p>{{customMessage}}</p>
        </div>
        {{/if}}
        
        <h3>What's included in your quote:</h3>
        <ul>
            <li>Complete spray foam removal</li>
            <li>Safe disposal of all waste materials</li>
            <li>Site cleanup</li>
            <li>Public liability insurance</li>
            <li>Compliance certificate</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{quoteAcceptanceUrl}}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept This Quote</a>
        </div>
        
        <p>Questions about your quote? Reply to this email or call us on <strong>0333 577 0132</strong>.</p>
        
        <p>Best regards,<br>{{sentByName}}<br>Foam Fighters Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
            Foam Fighters Ltd | Company Registration: 16612986<br>
            Quote valid for 30 days. Terms and conditions apply.
        </p>
    </div>
</body>
</html>`,

      'project-update.hbs': `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Project Update - Foam Fighters</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c5aa0;">Foam Fighters</h1>
            <p style="color: #666;">Professional Spray Foam Removal Services</p>
        </div>
        
        <h2>Project Update: {{projectTitle}}</h2>
        
        <p>Hello {{customerName}},</p>
        
        <p>We wanted to update you on the progress of your spray foam removal project.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Project:</strong> {{projectTitle}}</p>
            <p><strong>Status:</strong> {{status}}</p>
            <p><strong>Progress:</strong> {{progressPercentage}}% complete</p>
            {{#if scheduledDate}}<p><strong>Next Scheduled:</strong> {{scheduledDate}}</p>{{/if}}
        </div>
        
        {{#if updateMessage}}
        <h3>Latest Update:</h3>
        <p>{{updateMessage}}</p>
        {{/if}}
        
        {{#if nextSteps}}
        <h3>Next Steps:</h3>
        <ul>
            {{#each nextSteps}}
            <li>{{this}}</li>
            {{/each}}
        </ul>
        {{/if}}
        
        <p>If you have any questions, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>{{technician}}<br>Foam Fighters Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
            Foam Fighters Ltd | Company Registration: 16612986
        </p>
    </div>
</body>
</html>`,

      'welcome-email.hbs': `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to Foam Fighters</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c5aa0;">Welcome to Foam Fighters!</h1>
        </div>
        
        <h2>Hello {{userName}},</h2>
        
        <p>Welcome to the Foam Fighters team! Your account has been created successfully.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Email:</strong> {{userEmail}}</p>
            <p><strong>Role:</strong> {{userRole}}</p>
            <p><strong>Access Level:</strong> {{accessLevel}}</p>
        </div>
        
        <h3>Getting Started:</h3>
        <ul>
            <li>Log in to your account using your email address</li>
            <li>Complete your profile information</li>
            <li>Familiarize yourself with the dashboard</li>
            <li>Contact your manager for any training requirements</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{loginUrl}}" style="background: #2c5aa0; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Access Dashboard</a>
        </div>
        
        <p>If you have any questions, please contact your administrator.</p>
        
        <p>Best regards,<br>The Foam Fighters Team</p>
    </div>
</body>
</html>`,

      'password-reset.hbs': `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset - Foam Fighters</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c5aa0;">Foam Fighters</h1>
        </div>
        
        <h2>Password Reset Request</h2>
        
        <p>Hello {{userName}},</p>
        
        <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{resetUrl}}" style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        
        <p>This link will expire in 1 hour for security reasons.</p>
        
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">{{resetUrl}}</p>
        
        <p>Best regards,<br>The Foam Fighters Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
            If you're having trouble with the link, contact support at info@foamfighters.co.uk
        </p>
    </div>
</body>
</html>`
    };

    const templateName = templateFile.replace('.hbs', '');
    if (templates[templateFile]) {
      await fs.writeFile(templatePath, templates[templateFile].trim());
    }
  }

  /**
   * Send templated email
   */
  async sendTemplatedEmail(templateType, to, templateData, priority = 'normal') {
    try {
      await this.ensureInitialized();

      const template = this.templates.get(templateType);
      if (!template) {
        throw new Error(`Template not found: ${templateType}`);
      }

      // Prepare email data
      const emailData = {
        companyName: 'Foam Fighters Ltd',
        companyPhone: '0333 577 0132',
        companyEmail: 'info@foamfighters.co.uk',
        ...templateData
      };

      const htmlContent = template(emailData);
      
      // Create text version (basic HTML stripping)
      const textContent = htmlContent
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      const mailOptions = {
        from: {
          name: 'Foam Fighters',
          address: process.env.EMAIL_FROM_ADDRESS || 'noreply@foamfighters.co.uk'
        },
        to: to,
        subject: this.getEmailSubject(templateType, emailData),
        html: htmlContent,
        text: textContent,
        priority: priority,
        headers: {
          'X-Template-Type': templateType,
          'X-Company': 'Foam Fighters Ltd'
        }
      };

      const result = await this.transporter.sendMail(mailOptions);

      safeDebugLog('Email sent successfully', {
        templateType,
        to: Array.isArray(to) ? to.length + ' recipients' : to,
        messageId: result.messageId,
        priority
      });

      // Log preview URL for development
      if (process.env.NODE_ENV === 'development' && result.previewUrl) {
        safeDebugLog('Email preview URL', { url: result.previewUrl });
      }

      return result;

    } catch (error) {
      safeDebugError('Failed to send templated email', {
        templateType,
        to,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get email subject based on template type
   */
  getEmailSubject(templateType, data) {
    const subjects = {
      'inquiry-confirmation': `Inquiry Confirmation - ${data.referenceNumber || 'Foam Fighters'}`,
      'quote-email': `Your Spray Foam Removal Quote - ${data.quoteNumber || ''}`,
      'project-update': `Project Update: ${data.projectTitle || 'Your Foam Removal Project'}`,
      'welcome-email': 'Welcome to Foam Fighters',
      'password-reset': 'Password Reset - Foam Fighters'
    };

    return subjects[templateType] || 'Foam Fighters Notification';
  }

  /**
   * Send inquiry confirmation email
   */
  async sendInquiryConfirmation(inquiryData) {
    const responseTime = this.getResponseTime(inquiryData.urgency);
    
    return this.sendTemplatedEmail('inquiry-confirmation', inquiryData.email, {
      customerName: inquiryData.name,
      referenceNumber: inquiryData.referenceNumber,
      subject: inquiryData.subject,
      submittedAt: inquiryData.submittedAt.toLocaleDateString('en-GB'),
      urgency: inquiryData.urgency,
      responseTime
    });
  }

  /**
   * Send new inquiry notification to business email
   */
  async sendNewInquiryNotification(formData, referenceId) {
    // Send notification to business owners
    const recipients = ['cheryl.dawnsmith36@gmail.com', 'ryanguthrie@zoho.com'];
    
    // Load the new_inquiry template
    const templatePath = path.join(__dirname, '../templates/new_inquiry.hbs');
    let template;
    
    try {
      const templateContent = await fs.readFile(templatePath, 'utf8');
      template = handlebars.compile(templateContent);
    } catch (error) {
      safeDebugError('Failed to load new_inquiry template', error);
      throw new Error('Email template not found');
    }

    const templateData = {
      reference: referenceId,
      customerName: `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Not provided',
      email: formData.email || 'Not provided',
      phone: formData.phone || 'Not provided',
      propertyType: formData.propertyType || 'Not specified',
      estimatedArea: formData.estimatedArea || 'Not specified',
      address: formData.address || '',
      urgency: formData.urgency || 'normal',
      additionalInfo: formData.additionalInfo || '',
      submittedAt: new Date().toLocaleString('en-GB')
    };

    const htmlContent = template(templateData);
    
    const mailOptions = {
      from: {
        name: 'Foam Fighters Website',
        address: 'notifications@foamfighters.uk'
      },
      to: recipients,
      subject: `🏠 New Quote Request - ${referenceId}`,
      html: htmlContent
    };

    await this.ensureInitialized();
    const result = await this.transporter.sendMail(mailOptions);
    
    safeDebugLog('New inquiry notification sent', {
      reference: referenceId,
      recipients: recipients.length,
      messageId: result.messageId
    });

    return result;
  }

  /**
   * Send quote email
   */
  async sendQuoteEmail(quoteData, options = {}) {
    const templateData = {
      customerName: quoteData.customerInfo.name,
      quoteNumber: quoteData.quoteNumber,
      totalAmount: quoteData.totalAmount.toFixed(2),
      expiresAt: quoteData.expiresAt.toLocaleDateString('en-GB'),
      estimatedArea: quoteData.removalDetails.estimatedArea,
      propertyAddress: quoteData.propertyDetails.address,
      customMessage: options.customMessage,
      sentByName: options.sentBy || 'Foam Fighters Team',
      quoteAcceptanceUrl: `https://foamfighters.co.uk/accept-quote/${quoteData.id}`
    };

    return this.sendTemplatedEmail('quote-email', quoteData.customerInfo.email, templateData);
  }

  /**
   * Get response time based on urgency
   */
  getResponseTime(urgency) {
    const times = {
      urgent: '2 hours',
      high: '4 hours',
      medium: '24 hours',
      low: '48 hours'
    };
    return times[urgency] || '24 hours';
  }
}

// Create singleton instance (lazy-loaded)
let emailService = null;

function getEmailService() {
  if (!emailService) {
    emailService = new EmailService();
  }
  return emailService;
}

module.exports = getEmailService();