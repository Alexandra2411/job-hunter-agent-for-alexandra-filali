#!/bin/bash

# GitHub Publishing Script for Job Hunter Agent
set -e

# Color definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}===================================================${NC}"
echo -e "${BLUE}       Publishing Job Hunter Agent to GitHub        ${NC}"
echo -e "${BLUE}===================================================${NC}"

# Initialize Git if needed
if [ ! -d .git ]; then
    echo "Initializing local Git repository..."
    git init -b main
else
    echo "Git repository already initialized."
fi

# Add files
echo "Staging files..."
git add .

# Check if there is anything to commit
if git diff --cached --quiet; then
    echo "No new changes to commit."
else
    echo "Creating local commit..."
    git commit -m "feat: Initial commit of Job Hunter Agent for Alexandra Filali"
fi

# Check for GitHub CLI (gh)
if command -v gh &> /dev/null; then
    echo -e "${GREEN}GitHub CLI (gh) detected.${NC}"
    
    # Check auth status
    if gh auth status &> /dev/null; then
        echo "Successfully authenticated with GitHub CLI."
        
        read -p "Do you want to create a [1] Private or [2] Public repository? (Enter 1 or 2): " repo_type
        
        if [ "$repo_type" = "2" ]; then
            VISIBILITY="--public"
        else
            VISIBILITY="--private"
        fi
        
        echo "Creating repository on GitHub..."
        gh repo create job-hunter-agent $VISIBILITY --source=. --push || {
            echo -e "${YELLOW}Could not create repository via gh (it might already exist). Checking remote...${NC}"
        }
    else
        echo -e "${YELLOW}GitHub CLI is installed but not authenticated.${NC}"
        echo "Please run: gh auth login"
        echo "And then push the code manually."
    fi
else
    # Manual instructions
    echo -e "${YELLOW}GitHub CLI (gh) not found.${NC}"
    echo "Please publish the code manually using these steps:"
    echo -e "1. Create a new repository named ${BLUE}job-hunter-agent${NC} on github.com"
    echo "2. Run the following commands in this directory:"
    echo -e "   ${GREEN}git remote add origin https://github.com/your-username/job-hunter-agent.git${NC}"
    echo -e "   ${GREEN}git branch -M main${NC}"
    echo -e "   ${GREEN}git push -u origin main${NC}"
fi

echo -e "${GREEN}===================================================${NC}"
echo -e "${GREEN}                  Publishing Done                  ${NC}"
echo -e "${GREEN}===================================================${NC}"
