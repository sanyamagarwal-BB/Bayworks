# 🚀 BAYWORKS Deployment Guide

## Choose Your Platform

Your site is **production-ready**. Pick the option that works best for you:

---

## Option 1: Vercel (Recommended - 2 minutes)

**Best for:** Automatic updates, global CDN, free tier, preview URLs

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```
- Opens browser → Sign up / Log in with GitHub, GitLab, or email
- Copy token back to terminal

### Step 3: Deploy
```bash
# From BayWorks directory
vercel --prod
```

**That's it!** You'll get a URL like:
```
https://bayworks.vercel.app
```

### Additional Features
- Automatic redeploys on `git push` (if linked to GitHub)
- Preview URLs for testing before production
- Environment variables via Vercel dashboard
- Analytics included

---

## Option 2: Netlify (2 minutes)

**Best for:** Simple setup, great UI, free tier, form handling

### Step 1: Install Netlify CLI
```bash
npm install -g netlify-cli
```

### Step 2: Login
```bash
netlify login
```
- Opens browser → Authenticate
- Returns to terminal

### Step 3: Deploy
```bash
netlify deploy --prod --dir dist
```

**You'll get a URL like:**
```
https://bayworks.netlify.app
```

### Additional Features
- Built-in form submissions
- Custom domains (easy setup)
- Analytics included
- Scheduled functions (advanced)

---

## Option 3: GitHub Pages (Free but limited)

### Step 1: Create GitHub repo
```bash
git init
git add .
git commit -m "Initial commit: BAYWORKS Sprint 1"
git remote add origin https://github.com/YOUR_USERNAME/bayworks.git
git push -u origin main
```

### Step 2: Enable Pages
- GitHub repo → Settings → Pages
- Source: Deploy from branch
- Branch: main, folder: dist

**You'll get:**
```
https://YOUR_USERNAME.github.io/bayworks
```

⚠️ **Note:** GitHub Pages doesn't support Vercel-style functions. Fine for static sites.

---

## Option 4: Self-Hosted Server

### Step 1: Build
```bash
npm run build
# Creates /dist folder with all files
```

### Step 2: Copy to Server
```bash
# Via SCP/SFTP/FTP, upload the /dist folder to your server
# Example with SCP:
scp -r dist/* user@yourserver.com:/var/www/html/bayworks/
```

### Step 3: Configure Web Server

**Apache (.htaccess):**
```
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

**Nginx:**
```nginx
location / {
  try_files $uri /index.html;
}
```

**You'll get:**
```
https://yourdomain.com
```

---

## Option 5: Docker (Production-Grade)

### Create Dockerfile
```dockerfile
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Build & Run
```bash
docker build -t bayworks .
docker run -p 80:80 bayworks
```

---

## 🎯 Recommended: Vercel

1. **Easiest setup** (2 minutes)
2. **Best performance** (global CDN)
3. **Free tier** (up to 100GB/month)
4. **Auto-deploys** from GitHub
5. **Preview URLs** for testing
6. **One-click rollbacks**

---

## ✅ Pre-Deployment Checklist

- [ ] Run `npm run build` (no errors)
- [ ] Test locally: `npm run dev`
- [ ] Check all Sprint 1 features work:
  - [ ] Quote Generator calculates price
  - [ ] Savings Calculator shows reduction
  - [ ] Booking confirmation appears
  - [ ] Quiz gives recommendation
  - [ ] Chat widget responds
- [ ] Verify WhatsApp number is correct: +91 92050 05399
- [ ] Hero image URL (if custom photo added)

---

## 📊 Deployment Comparison

| Platform | Setup Time | Free Tier | Custom Domain | Auto-Deploy | Best For |
|----------|-----------|-----------|---------------|-------------|----------|
| **Vercel** | 2 min | ✓ (100GB) | ✓ ($10/mo) | ✓ GitHub | Production |
| **Netlify** | 2 min | ✓ (100GB) | ✓ ($12/mo) | ✓ GitHub | Production |
| **GitHub Pages** | 5 min | ✓ Unlimited | ✓ (free) | ✓ Built-in | Hobby |
| **Self-Hosted** | 30 min | - | ✓ (your cost) | Manual | Enterprise |
| **Docker** | 15 min | - | ✓ (your cost) | Manual | Enterprise |

---

## 🌍 Custom Domain Setup

### For Vercel:
1. Buy domain (GoDaddy, Namecheap, etc.)
2. Vercel Dashboard → Project Settings → Domains
3. Add your domain
4. Update DNS records (Vercel shows exact steps)
5. Wait 24-48 hours for DNS propagation

### For Netlify:
1. Buy domain
2. Netlify Dashboard → Domain Settings
3. Add custom domain
4. Update DNS (Netlify guides you)

---

## 🔄 Post-Deployment

### Monitor Performance
- Vercel Analytics: vercel.com/dashboard
- Netlify Analytics: netlify.com/dashboard

### Manage Content
```
http://YOUR_DOMAIN/admin.html
```
- Edit all sections without redeploying
- Changes save to localStorage (browser storage)
- Works offline too!

### Track Leads
- WhatsApp messages come to: +91 92050 05399
- Chat widget messages appear in widget (save manually)
- Booking forms: check browser console or add backend

---

## 🚀 Next Steps After Launch

### Week 1: Test with Users
- Share live URL with colleagues
- Get feedback on:
  - Quote accuracy
  - Booking experience
  - Lead quiz helpfulness
  - Chat widget usefulness

### Week 2: Iterate Sprint 1
- Fix any issues
- Adjust pricing/formulas if needed
- Update testimonials with real client quotes

### Week 3: Plan Sprint 2
- Add real property database
- Integrate CRM for leads
- Enable email notifications
- Build landing pages for ads

---

## 🆘 Troubleshooting

**"Build fails with error"**
```bash
npm run build
# Check error output, usually missing dependencies
npm install
npm run build
```

**"Deploy stuck or slow"**
```bash
# Clear cache and retry
rm -rf .vercel node_modules dist
npm install
vercel --prod --force
```

**"Admin dashboard not loading"**
- Use private/incognito browser (clear old data)
- Check browser console (F12) for errors
- Verify admin.html exists in dist/

**"WhatsApp links don't work"**
- Double-check number format: `919205005399`
- Links work on mobile/desktop WhatsApp
- Web version may redirect to mobile app

---

## 💡 Pro Tips

1. **Version Control:** Use GitHub to track changes
   ```bash
   git add .
   git commit -m "Sprint 1 launch"
   git push
   ```

2. **Backup CMS Data:** Export to JSON regularly
   ```javascript
   // Browser console:
   const data = localStorage.getItem('bayworks_cms');
   console.log(data);
   // Copy and save to safe location
   ```

3. **Monitor Performance:**
   - Vercel: Check Lighthouse scores
   - Netlify: Check bundle size trends

4. **Iterate Quickly:**
   - Deploy multiple times (no cost)
   - A/B test headlines
   - Track which features get clicks

---

## ✨ You're Ready!

Your site is optimized, tested, and production-ready.

**Choose your platform and deploy now!** 🚀

---

**Questions?** Check:
- Vercel Docs: https://vercel.com/docs
- Netlify Docs: https://docs.netlify.com
- Or reach out to support
