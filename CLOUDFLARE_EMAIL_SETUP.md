# 📧 Cloudflare Email Setup for foamfighters.uk

## 🎯 Goal: Professional Email with Your Domain

Set up `info@foamfighters.uk` and `quotes@foamfighters.uk` for form submissions.

## 📋 Step-by-Step Setup

### **Step 1: Enable Cloudflare Email Routing**

1. **Login to Cloudflare Dashboard**
   - Go to: https://dash.cloudflare.com
   - Select your `foamfighters.uk` domain

2. **Navigate to Email Routing**
   - Click **Email** tab in left sidebar
   - Click **Email Routing**
   - Click **Enable Email Routing**

3. **Add MX Records** (Cloudflare does this automatically)
   - DNS records will be added automatically
   - This makes `@foamfighters.uk` emails work

### **Step 2: Create Email Routes**

**Add these forwarding rules:**

1. **Business Inquiries:**
   - **Route**: `info@foamfighters.uk`
   - **Forward to**: Your personal Gmail address
   - **Purpose**: General business emails

2. **Quote Requests:**
   - **Route**: `quotes@foamfighters.uk` 
   - **Forward to**: Your personal Gmail address
   - **Purpose**: Form submission notifications

3. **Catch-All (Optional):**
   - **Route**: `*@foamfighters.uk`
   - **Forward to**: Your personal Gmail address
   - **Purpose**: Catch any other emails

### **Step 3: Verify Email Routing**

1. **Send Test Email**
   - Email: `info@foamfighters.uk`
   - Check it arrives in your Gmail

2. **Verify SPF Record**
   - Cloudflare adds automatically
   - Improves email deliverability

## 🔧 Gmail App Password Setup

To **send emails** from forms using Gmail SMTP:

### **Enable 2-Factor Authentication**
1. Go to: https://myaccount.google.com/security
2. Turn on **2-Step Verification**
3. Follow the setup process

### **Generate App Password**
1. Go to: https://myaccount.google.com/apppasswords
2. Select **Mail** for app
3. Select **Other** for device → Type "Foam Fighters Website"
4. Click **Generate**
5. **Copy the 16-character password** (save it!)

## ⚙️ Firebase Email Configuration

Once you have the App Password:

```bash
# Set Gmail SMTP settings
firebase functions:config:set smtp.host="smtp.gmail.com"
firebase functions:config:set smtp.port="587"
firebase functions:config:set smtp.user="your-personal@gmail.com"
firebase functions:config:set smtp.password="your-app-password"
firebase functions:config:set smtp.secure="false"

# Set business email addresses
firebase functions:config:set email.from="info@foamfighters.uk"
firebase functions:config:set email.business="quotes@foamfighters.uk"
firebase functions:config:set email.reply="info@foamfighters.uk"

# Deploy configuration
firebase deploy --only functions
```

## 📧 How Emails Will Work

### **Customer Submits Form:**
1. **Data saved** to Firestore database
2. **Confirmation email** sent to customer from `info@foamfighters.uk`
3. **Notification email** sent to `quotes@foamfighters.uk` → forwards to your Gmail

### **Email Content:**
- **Subject**: Professional subject lines
- **From**: `info@foamfighters.uk` (looks professional!)
- **Reply-To**: `info@foamfighters.uk`
- **Content**: Branded email templates

### **Your Workflow:**
1. **Customer submits** quote request on website
2. **You receive email** in your Gmail (forwarded from quotes@foamfighters.uk)
3. **You reply** directly from Gmail (shows as from foamfighters.uk)
4. **Professional appearance** throughout

## 🎯 Benefits

✅ **Professional**: All emails show @foamfighters.uk  
✅ **Free**: Cloudflare Email Routing is free  
✅ **Simple**: Manage from your existing Gmail  
✅ **Branded**: Customers see your business domain  
✅ **Deliverable**: Better spam protection  

## 🔍 Testing

1. **Set up email routing** in Cloudflare
2. **Configure Gmail** app password  
3. **Update Firebase** configuration
4. **Test form submission** on live website
5. **Check emails** arrive properly

Ready to set up professional email for your forms!