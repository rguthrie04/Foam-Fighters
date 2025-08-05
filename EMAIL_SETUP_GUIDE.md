# 📧 **Email Setup Guide - Cloudflare Integration**

## ✅ **What I've Set Up:**

1. **Email Service Integration** - Connected to backend
2. **Email Template** - Professional HTML template for notifications
3. **Form Handler** - Sends emails when forms are submitted

## 🔧 **Configuration Needed:**

### **Step 1: Cloudflare Email Details**
Please provide:
- **Your domain:** (e.g., `foamfighters.uk`)
- **Cloudflare email address:** (e.g., `info@foamfighters.uk`)
- **Your notification email:** Where you want to receive form submissions

### **Step 2: SMTP Configuration**
Since you're using Cloudflare email routing, you have a few options:

#### **Option A: Gmail SMTP (Easiest)**
If you forward Cloudflare emails to Gmail:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-app-password
NOTIFICATION_EMAIL=info@foamfighters.uk
```

#### **Option B: Outlook/Hotmail SMTP**
If you forward to Outlook:
```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-outlook@outlook.com
SMTP_PASSWORD=your-password
NOTIFICATION_EMAIL=info@foamfighters.uk
```

#### **Option C: Third-Party SMTP (SendGrid, Mailgun)**
For higher reliability:
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
NOTIFICATION_EMAIL=info@foamfighters.uk
```

## 🚀 **What Happens When Someone Submits a Form:**

1. **Form Data Collected** ✅
2. **Email Sent to You** 📧 (with all form details)
3. **Customer Gets Confirmation** 🎯
4. **Reference Number Generated** (FF-1234567890)

## 📨 **Email Template Preview:**

The notification email includes:
- **Customer Information** (name, email, phone)
- **Property Details** (type, area, address)
- **Urgency Level** (with visual indicators)
- **Additional Information** (customer notes)
- **Reference Number** (for tracking)

## 🧪 **Testing Process:**

1. **Set up SMTP credentials** (environment variables)
2. **Deploy to live Firebase** (so emails work)
3. **Submit test form** on live website
4. **Check your email** for notifications

## ❓ **Quick Setup Questions:**

1. **What's your domain?**
2. **What email did you set up in Cloudflare?**
3. **Where should notifications go?** (your personal email)
4. **Do you have Gmail/Outlook for SMTP?**

Once you provide these details, I'll configure everything and we can test it! 🚀