#!/bin/bash

# =============================================================================
# BINDISA AGRITECH - PRODUCTION BUILD SCRIPT
# =============================================================================

set -e  # Exit on any error

echo "🚀 Building Bindisa Agritech for Production..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[BUILD]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf dist/
rm -rf server/dist/
rm -rf build/

# Install frontend dependencies
print_status "Installing frontend dependencies..."
npm ci

# Build frontend
print_status "Building frontend for production..."
npm run build

# Install backend dependencies
print_status "Installing backend dependencies..."
cd server
npm ci
cd ..

# Create production package
print_status "Creating production package..."
mkdir -p production-package

# Copy frontend build
cp -r dist/ production-package/frontend/

# Copy backend
cp -r server/ production-package/backend/

# Copy deployment files
cp docker-compose.yml production-package/
cp nginx.conf production-package/
cp deploy.sh production-package/
cp .env.production production-package/.env.example

# Create README for production
cat > production-package/README.md << 'EOF'
# Bindisa Agritech - Production Package

## Quick Deploy

1. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your production values
   ```

2. **Deploy with Docker**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

3. **Or Deploy Manually**
   ```bash
   # Start services
   docker-compose up -d
   
   # Check health
   curl http://localhost:5000/health
   ```

## Services

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Database**: MongoDB on port 27017
- **Cache**: Redis on port 6379

## Features

✅ **Complete Agriculture Platform**
- User Registration & Authentication
- Soil Analysis with AI Recommendations
- Real-time Chat Support
- Multi-language Support (English, Hindi, Marathi)
- File Upload & Management
- Analytics Dashboard
- Contact Forms & Email Notifications

✅ **Production Ready**
- Docker containerized
- Nginx reverse proxy
- SSL/HTTPS support
- Database backups
- Monitoring & logging
- Security headers
- Rate limiting

✅ **Scalable Architecture**
- Microservices ready
- Load balancer friendly
- Database indexing
- Caching layer
- CDN ready

## API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

### Soil Analysis
- POST /api/soil/analysis
- GET /api/soil/analysis
- GET /api/soil/analysis/:id
- GET /api/soil/statistics

### Chat & Support
- POST /api/chat/sessions
- POST /api/chat/sessions/:id/messages
- GET /api/chat/sessions/:id/history

### Contact & Content
- POST /api/contact
- GET /api/team
- GET /api/technology
- GET /api/success-stories

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- React Router
- Framer Motion
- Vite build tool

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Socket.IO (real-time)
- Cloudinary (file storage)
- Nodemailer (emails)

**Infrastructure:**
- Docker + Docker Compose
- Nginx reverse proxy
- Redis caching
- SSL/TLS encryption

## Support

For technical support: support@bindisa-agritech.com
For business inquiries: info@bindisaagritech.com

---
© 2024 Bindisa Agritech Pvt. Ltd. All rights reserved.
EOF

# Create package info
cat > production-package/package-info.json << EOF
{
  "name": "bindisa-agritech-production",
  "version": "1.0.0",
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "buildHash": "$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')",
  "environment": "production",
  "components": {
    "frontend": "React 18 + TypeScript",
    "backend": "Node.js + Express + MongoDB",
    "proxy": "Nginx",
    "cache": "Redis",
    "containerization": "Docker"
  },
  "features": [
    "User Authentication & Authorization",
    "Soil Analysis & Recommendations", 
    "Real-time Chat Support",
    "Multi-language Support",
    "File Upload & Management",
    "Email Notifications",
    "Analytics Dashboard",
    "Production Security",
    "SSL/HTTPS Support",
    "Database Backups",
    "Monitoring & Logging"
  ]
}
EOF

# Create deployment archive
print_status "Creating deployment archive..."
tar -czf bindisa-agritech-production.tar.gz production-package/

# Calculate sizes
FRONTEND_SIZE=$(du -sh production-package/frontend | cut -f1)
BACKEND_SIZE=$(du -sh production-package/backend | cut -f1)
TOTAL_SIZE=$(du -sh production-package | cut -f1)
ARCHIVE_SIZE=$(du -sh bindisa-agritech-production.tar.gz | cut -f1)

print_status "✅ Production build completed successfully!"
echo ""
echo "📦 Package Information:"
echo "   Frontend: $FRONTEND_SIZE"
echo "   Backend: $BACKEND_SIZE"
echo "   Total: $TOTAL_SIZE"
echo "   Archive: $ARCHIVE_SIZE"
echo ""
echo "🚀 Ready for deployment:"
echo "   Package: ./production-package/"
echo "   Archive: ./bindisa-agritech-production.tar.gz"
echo ""
echo "📋 Next steps:"
echo "   1. Upload to your server"
echo "   2. Extract: tar -xzf bindisa-agritech-production.tar.gz"
echo "   3. Setup: cd production-package && cp .env.example .env"
echo "   4. Deploy: ./deploy.sh"
echo ""
print_status "🎉 Bindisa Agritech is ready for production hosting!"
