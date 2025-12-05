#!/bin/bash
# Quick script to start the backend server

cd "$(dirname "$0")/backend-server"

echo "🚀 Starting LoadMaster Backend Server..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found in backend-server/"
    echo "   Please create it with your STRIPE_SECRET_KEY"
    exit 1
fi

# Check if Stripe key is set
if grep -q "sk_test_your_key_here" .env; then
    echo "⚠️  Warning: Stripe secret key appears to be a placeholder"
    echo "   Please update STRIPE_SECRET_KEY in backend-server/.env"
    echo ""
fi

# Start the server
echo "📍 Starting server on http://localhost:3000"
echo "   Press Ctrl+C to stop"
echo ""
npm start

