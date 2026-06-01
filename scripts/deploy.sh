#!/bin/bash

# Vercel Deployment Script for Job Hunter Agent
set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===================================================${NC}"
echo -e "${BLUE}       Deploying Job Hunter Agent to Vercel        ${NC}"
echo -e "${BLUE}===================================================${NC}"

# Check for Vercel CLI via npx (ensures no global install required)
echo -e "${GREEN}[1/4] Checking Vercel CLI...${NC}"
if ! npx vercel --version &> /dev/null; then
    echo -e "${RED}Vercel CLI could not be resolved. Make sure Node.js and npm are installed.${NC}"
    exit 1
fi
echo -e "Vercel CLI resolved successfully via npx."

# Login verification
echo -e "${GREEN}[2/4] Authenticating with Vercel...${NC}"
echo "Running login check. Please authenticate if prompted..."
npx vercel login

# Link project and push environment variables
echo -e "${GREEN}[3/4] Registering environment variables on Vercel...${NC}"
echo "We will now register project environment variables. Note that if they already exist, you can skip this step."

read -p "Enter your GEMINI_API_KEY: " gemini_key
read -p "Enter your GMAIL_USER (Gmail email address): " gmail_user
read -p "Enter your GMAIL_PASS (16-char App Password): " gmail_pass
read -p "Enter your SUPABASE_URL (Optional, leave blank to use SQLite): " supabase_url
read -p "Enter your SUPABASE_ANON_KEY (Optional, leave blank to use SQLite): " supabase_key

# Create project and link it
echo "Linking project to Vercel..."
npx vercel link --yes

# Push secrets to Vercel
echo "Setting environment variables on Vercel..."
if [ -not -z "$gemini_key" ]; then
    echo "$gemini_key" | npx vercel env add GEMINI_API_KEY production --force || true
fi
if [ -not -z "$gmail_user" ]; then
    echo "$gmail_user" | npx vercel env add GMAIL_USER production --force || true
fi
if [ -not -z "$gmail_pass" ]; then
    echo "$gmail_pass" | npx vercel env add GMAIL_PASS production --force || true
fi
if [ -not -z "$supabase_url" ]; then
    echo "$supabase_url" | npx vercel env add SUPABASE_URL production --force || true
fi
if [ -not -z "$supabase_key" ]; then
    echo "$supabase_key" | npx vercel env add SUPABASE_ANON_KEY production --force || true
fi

# Deploy
echo -e "${GREEN}[4/4] Triggering Vercel deployment...${NC}"
npx vercel --prod --yes

echo -e "${GREEN}===================================================${NC}"
echo -e "${GREEN}    SUCCESS: Dashboard is live on Vercel!          ${NC}"
echo -e "${GREEN}===================================================${NC}"
