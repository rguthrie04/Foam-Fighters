# 📧 **Zoho Email Setup for foamfighters.uk**

## 🎯 **Goal:**
Set up professional email sending from `notifications@foamfighters.uk` using Zoho SMTP.

---

## **STEP 1: Add foamfighters.uk to Your Zoho Account**

### **1.1 Log into Zoho Mail Admin**
- Go to: [mail.zoho.com](https://mail.zoho.com) 
- Sign in with your existing Zoho account

### **1.2 Add New Domain**
- Go to **Control Panel** → **Domains**
- Click **"Add Domain"**
- Enter: `foamfighters.uk`
- Choose plan (Free supports up to 5 users)

### **1.3 Verify Domain Ownership**
Zoho will ask you to verify ownership. You'll need to add DNS records to Cloudflare:

**Option A: TXT Record (Recommended)**
```
Type: TXT
Name: @
Value: zoho-verification=XXXXX.zmverify.zoho.com
```

**Option B: CNAME Record**
```
Type: CNAME  
Name: zb12345678 (Zoho will provide this)
Value: business.zoho.com
```

---

## **STEP 2: Configure DNS in Cloudflare**

### **2.1 Add MX Records**
In your Cloudflare DNS settings for `foamfighters.uk`:

```
Type: MX, Name: @, Value: mx.zoho.com, Priority: 10
Type: MX, Name: @, Value: mx2.zoho.com, Priority: 20  
Type: MX, Name: @, Value: mx3.zoho.com, Priority: 50
```

### **2.2 Add SMTP/IMAP Records (Optional but Recommended)**
```
Type: CNAME, Name: imap, Value: imap.zoho.com
Type: CNAME, Name: smtp, Value: smtp.zoho.com
Type: CNAME, Name: pop, Value: pop.zoho.com
```

### **2.3 Add SPF Record**
```
Type: TXT, Name: @, Value: v=spf1 include:zoho.com ~all
```

### **2.4 Add DKIM Record**
Zoho will provide you with a DKIM record like:
```
Type: TXT, Name: zoho._domainkey, Value: (long key provided by Zoho)
```

---

## **STEP 3: Create Email Account**

### **3.1 Create notifications@foamfighters.uk**
- In Zoho Admin Panel
- Go to **Users** → **Add User**
- Email: `notifications@foamfighters.uk`
- Set a secure password
- **Save the credentials!**

### **3.2 Test Email Account**
- Try logging into the new email account
- Send a test email to yourself

---

## **STEP 4: Get SMTP Settings**

### **Zoho SMTP Configuration:**
```
SMTP Host: smtp.zoho.com
SMTP Port: 587 (or 465 for SSL)
SMTP Security: STARTTLS (or SSL)
SMTP Username: notifications@foamfighters.uk
SMTP Password: (password you set)
```

---

## **STEP 5: Configure Firebase Environment**

I'll help you set these environment variables in Firebase:

```bash
firebase functions:config:set \
  smtp.host="smtp.zoho.com" \
  smtp.port="587" \
  smtp.secure="false" \
  smtp.user="notifications@foamfighters.uk" \
  smtp.password="YOUR_PASSWORD" \
  notification.email="notifications@foamfighters.uk"
```

---

## **STEP 6: Update Cloudflare Email Routing**

### **6.1 Add Custom Address**
In Cloudflare Email Routing:
- Add custom address: `notifications@foamfighters.uk`
- Forward to: Both your personal emails

### **6.2 Add Other Business Emails (Optional)**
```
info@foamfighters.uk → your personal emails
contact@foamfighters.uk → your personal emails
support@foamfighters.uk → your personal emails
```

---

## **🚀 QUICK START (If You Want to Skip Zoho Setup):**

**Alternative: Use Gmail with Custom From Address**
If Zoho setup seems complex, we can:
1. Use Cheryl's Gmail SMTP
2. Set "From" address as `notifications@foamfighters.uk`
3. Set "Reply-To" as `info@foamfighters.uk`
4. Still looks professional to customers!

---

## **❓ What's Your Preference?**

1. **Full Zoho Setup** (most professional)
2. **Gmail with custom from address** (simpler)
3. **Let me know if you need help with any step!**

**Which approach would you like to take?** 🎯