#!/bin/bash

PROJECT_DIR="."  # Set this to your project folder if different

echo "🌸 Welcome, lovely human. Let's code something beautiful together."
echo "🧠 Running GPT Engineer gently, to prepare changes..."

# Run GPT Engineer (this will make changes immediately)
gpt-engineer "$PROJECT_DIR"

echo ""
echo "🧐 Let's review what I've changed for you:"
echo ""

# Show a summary of *all* changes (even unstaged ones)
git --no-pager diff --stat

echo ""
echo "📜 Detailed preview of changes:"
git --no-pager diff

echo ""
read -p "💬 Do you want to keep these changes? (yes/no): " CONFIRM

if [ "$CONFIRM" = "yes" ]; then
  echo "✅ Changes kept. Go forth and deploy brilliance. 🌈"
else
  echo "❌ Reverting all changes to your last known happy state..."
  git restore .  # Restores all files to the last commit
  echo "🔄 Done. Your files are as they were. No harm, no foul."
fi
