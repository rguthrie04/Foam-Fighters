# Google Search Console Verification Instructions

## Step-by-Step Process:

### 1. Get Verification File from Google
- In Google Search Console, choose "HTML file" verification method
- Download the file (will be named like `google1234567890abcdef.html`)

### 2. Add File to Your Website
- Save the downloaded file in the `frontend/` directory (same level as index.html)
- Example: Save as `frontend/google1234567890abcdef.html`

### 3. Rebuild and Deploy
Run these commands in the project root:
```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

### 4. Verify in Google Search Console
- Go back to Google Search Console
- Click "Verify"
- Should confirm ownership immediately

### 5. Submit Sitemap
Once verified:
- In Google Search Console, go to "Sitemaps" section
- Submit: `https://foamfighters.uk/sitemap.xml`

## Important URLs to Submit:
- Homepage: `https://foamfighters.uk/`
- Key pages: `/removal-process.html`, `/why-spf-problem.html`
- Sitemap: `https://foamfighters.uk/sitemap.xml`

## Monitoring:
Check these regularly:
- Search Performance (keywords, clicks, impressions)
- Coverage (indexed pages)
- Core Web Vitals (page speed)
- Manual Actions (penalties)