# 🚀 SeatScape — Netlify Deployment Guide

## Overview

SeatScape is a Next.js application. Deploying on Netlify requires:
1. A **GitHub repository** with your code
2. A **cloud database** (SQLite won't work on Netlify's serverless platform)
3. **Environment variables** configured on Netlify

---

## Step 1: Download & Prepare the Project Folder

### What to download
Download the **entire project folder** (the one containing `package.json`, `src/`, `prisma/`, etc.).

**Do NOT upload these folders** (they're in `.gitignore` and should not be deployed):
- `node_modules/` (Netlify installs these automatically)
- `.next/` (build output, regenerated on deploy)
- `db/` (local SQLite database — you'll use a cloud database instead)

### What you DO need:
```
seatscape/
├── src/                    ← all your application code
├── prisma/
│   └── schema.prisma       ← database schema
├── public/                 ← static files
├── package.json
├── next.config.ts
├── netlify.toml            ← Netlify config (already created)
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── components.json
└── .env.example            ← template for env vars
```

---

## Step 2: Set Up a Cloud Database (Neon PostgreSQL)

Since Netlify's serverless functions don't have a persistent filesystem, SQLite won't work. You need a cloud database.

### Option A: Neon (Recommended — Free PostgreSQL)

1. Go to [neon.tech](https://neon.tech) and sign up (free)
2. Click **"Create New Project"**
3. Name it `seatscape`
4. Select region closest to you
5. Copy the **Connection String** — it looks like:
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/seatscape?sslmode=require
   ```
6. Save this string — you'll need it for Netlify

### Option B: Supabase (Alternative)

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → Database → Connection string
4. Copy the URI

---

## Step 3: Update Prisma Schema for PostgreSQL

Before pushing to GitHub, update `prisma/schema.prisma`:

**Change line 12** from:
```prisma
provider = "sqlite"
```
To:
```prisma
provider = "postgresql"
```

That's the only change needed — the rest of the schema works with both databases.

---

## Step 4: Push to GitHub

### If you don't have Git installed:
1. Download Git from [git-scm.com](https://git-scm.com)
2. Install it

### Create a GitHub repository:
1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon → **"New repository"**
3. Name it `seatscape`
4. Set to **Public** or **Private** (either works)
5. **Do NOT** check "Add a README" (you already have files)
6. Click **"Create repository"**

### Push your code:
Open a terminal/command prompt in the project folder and run:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "SeatScape — Smart Seat Reservation by Inamul Haq"

# Set the main branch
git branch -M main

# Link to your GitHub repo (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/seatscape.git

# Push
git push -u origin main
```

If you get an error about `.env`, make sure `.gitignore` includes `.env` (it should already).

---

## Step 5: Connect Netlify

### Create a Netlify account:
1. Go to [netlify.com](https://app.netlify.com)
2. Sign up (use GitHub login for convenience)

### Deploy:
1. Click **"Add new site"** → **"Import an existing project"**
2. Connect to GitHub (if not already connected)
3. Select your `seatscape` repository
4. Netlify will auto-detect Next.js. Verify these settings:
   - **Build command**: `bun run build` (or `npm run build` if not using bun)
   - **Publish directory**: `.next`
   - **Functions directory**: (leave default)
5. Click **"Advanced"** → **"Add environment variable"** and add:

| Key | Value |
|---|---|
| `DATABASE_URL` | `postgresql://username:password@ep-xxx.neon.tech/seatscape?sslmode=require` |
| `SESSION_SECRET` | `any-long-random-string-here` (e.g., `my-super-secret-key-12345-change-this`) |

6. Click **"Deploy site"**

### Install Netlify CLI (optional, for local testing):
```bash
npm install -g netlify-cli
netlify login
netlify deploy
```

---

## Step 6: Initialize the Database

After the first deploy, you need to create the database tables and seed the data.

### Method 1: Using Netlify CLI (recommended)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Link your site
netlify link

# Run database setup
netlify env:set DATABASE_URL "your-neon-connection-string"
netlify functions:invoke --name prisma-setup
```

### Method 2: Using a local script with the cloud database

Set your `.env` file to use the Neon connection string:
```bash
# In .env file
DATABASE_URL=postgresql://username:password@ep-xxx.neon.tech/seatscape?sslmode=require
```

Then run from your local machine:
```bash
# Create all tables
bun run db:push

# Seed the database with demo data
bun run src/lib/seed.ts
```

This pushes the schema to your cloud database and creates the demo users, seats, and bookings.

---

## Step 7: Verify the Deployment

1. Netlify will give you a URL like `https://seatscape-xxx.netlify.app`
2. Visit the URL — you should see the SeatScape homepage
3. Try logging in with:
   - Employee ID: `EDU-0001` (Admin)
   - Password: `Password@123`

---

## Environment Variables Summary

| Variable | Where to get it | Example |
|---|---|---|
| `DATABASE_URL` | Neon dashboard → Connection string | `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require` |
| `SESSION_SECRET` | Make up any long string | `my-secret-key-change-this-12345` |

---

## Demo Login Credentials

| Role | Employee ID | Email | Password |
|---|---|---|---|
| Admin | `EDU-0001` | `anita.verma@edunet.org` | `Password@123` |
| Developer | `EDU-1001` | `vikram.singh@edunet.org` | `Password@123` |
| Employee | `EDU-2001` | `aarav.patel@edunet.org` | `Password@123` |

---

## Troubleshooting

### Build fails with Prisma error
- Make sure `prisma generate` runs during build. It's in the `postinstall` script and the `build` script.
- Check that `DATABASE_URL` is set correctly in Netlify environment variables.

### "Cannot connect to database"
- Verify your Neon connection string includes `?sslmode=require`
- Check that the database is active (Neon free tier auto-pauses after inactivity)

### Photos don't upload
- Netlify has a function size limit. Photos are stored as base64 in the database. For production, use a storage service like Cloudinary or AWS S3.

### Site loads but login doesn't work
- Make sure you ran the seed script against the cloud database (Step 6)

---

## File Checklist Before Deploying

- [ ] `prisma/schema.prisma` — provider changed to `postgresql`
- [ ] `.env` NOT uploaded (it's in `.gitignore`)
- [ ] `DATABASE_URL` set in Netlify environment variables
- [ ] `SESSION_SECRET` set in Netlify environment variables
- [ ] `netlify.toml` file present
- [ ] `package.json` has `postinstall: "prisma generate"`

---

## Need Help?

This platform was **crafted with care by Inamul Haq**.
