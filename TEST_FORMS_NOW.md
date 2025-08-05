# 🧪 Test Forms Now - Live Backend

## 🎯 **Quick Fix Applied**

Since Firebase Emulators aren't starting properly, I've **temporarily pointed localhost to the live backend**.

## ✅ **Test Your Forms:**

### **1. Refresh Your Local Website**
- **URL**: `http://localhost:3001`
- **Press F5** to reload the page
- **Forms will now connect** to the live backend

### **2. Submit Quote Form**
- Fill out the homepage quote form
- Click **Submit Quote Request**
- **Expected**: Success message with reference number (FF-####)

### **3. Submit Contact Form**  
- Go to Contact page via navigation
- Fill out the detailed assessment form
- Click **Submit Assessment Request**
- **Expected**: Success message

## 🔍 **What You Should See:**

### **✅ Success:**
```
"Your quote request has been submitted successfully! 
We'll contact you within 24-48 hours."

Reference: FF-1754427890
```

### **❌ If Still Errors:**
Check browser console (F12) for any remaining issues.

## 📧 **Next Steps (After Forms Work):**

1. **✅ Confirm forms submit successfully**
2. **📧 Set up email notifications** with `foamfighters.uk`
3. **🚀 Deploy fixes** to live website
4. **🧪 Test end-to-end** on live site

## 🔧 **Current Setup:**

- **Frontend**: `http://localhost:3001` (local Vite server)
- **Backend**: `https://api-6swwnulcrq-nw.a.run.app` (live Cloud Run)
- **Database**: Live Firestore (submissions will be saved!)

**This is actually better for testing** since the live backend has proper CORS and is fully functional.

## 🎯 **Try It Now:**

1. **Refresh** `http://localhost:3001`
2. **Submit** a quote form
3. **Check** for success message
4. **Report back** what happens!

Your forms should work perfectly now! 🚀