# 🚨 CRITICAL: SERVICE ACCOUNT KEY EXPOSED

## WHAT HAPPENED
- A Firebase Admin SDK service account private key was accidentally shared
- This key provides FULL administrative access to the Firebase project
- Key ID: `6732907b94ae020058b6b258b221e1eedcfc32b3`
- Service Account: `firebase-adminsdk-fbsvc@foam-fighters-2700b.iam.gserviceaccount.com`

## IMMEDIATE ACTIONS REQUIRED

### 1. REVOKE THE KEY (DO NOW!)
1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=foam-fighters-2700b
2. Click on: `firebase-adminsdk-fbsvc@foam-fighters-2700b.iam.gserviceaccount.com`
3. Go to "Keys" tab
4. Find key ID: `6732907b94ae020058b6b258b221e1eedcfc32b3`
5. **DELETE IT IMMEDIATELY**

### 2. MONITOR PROJECT ACCESS (Next 24 Hours)
- Check Firebase Console > Authentication for new users
- Check Firestore for unauthorized data access
- Monitor Cloud Console > IAM for permission changes
- Watch billing for unexpected usage

### 3. GET CORRECT WEB API KEY
For your frontend website, you need the Web API key, not service account:

1. Go to: https://console.firebase.google.com/project/foam-fighters-2700b/settings/general
2. Scroll to "Your apps" → Click your web app
3. Copy the `apiKey` value from the config object
4. This is safe to use in your frontend code

## WHAT THIS KEY COULD DO IF MISUSED
- ✅ Read/write ALL Firestore data
- ✅ Manage user accounts (create/delete)
- ✅ Access/modify Firebase Storage
- ✅ Change project settings
- ✅ Deploy Cloud Functions
- ✅ Modify security rules
- ✅ Access Google Cloud resources

## PREVENTION
- ✅ NEVER share service account keys
- ✅ Use Web API keys for frontend
- ✅ Store service account keys in secure secret managers
- ✅ Use environment variables for sensitive data
- ✅ Regular security audits

## STATUS
- [ ] Service account key revoked
- [ ] Web API key obtained
- [ ] Frontend updated with correct key
- [ ] Security monitoring in place

---
⚠️ **This is a critical security incident. Act immediately to revoke the exposed key.**