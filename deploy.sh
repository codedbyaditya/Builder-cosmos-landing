#!/bin/bash

# =============================================================================
# BINDISA AGRITECH - PRODUCTION DEPLOYMENT SCRIPT
# =============================================================================

set -e  # Exit on any error

echo "🚀 Starting Bindisa Agritech Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Docker and Docker Compose are installed ✓"
}

# Check environment file
check_environment() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        cp .env.production .env
        print_error "Please update .env file with your production values before continuing."
        print_status "Edit .env file: nano .env"
        exit 1
    fi
    print_status "Environment file found ✓"
}

# Validate required environment variables
validate_env() {
    print_header "Validating Environment Variables"
    
    required_vars=(
        "JWT_SECRET"
        "JWT_REFRESH_SECRET" 
        "MONGODB_URI"
        "SMTP_HOST"
        "SMTP_USER"
        "SMTP_PASS"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables:"
        printf '%s\n' "${missing_vars[@]}"
        exit 1
    fi
    
    print_status "All required environment variables are set ✓"
}

# Build and start services
deploy_services() {
    print_header "Building and Starting Services"
    
    # Pull latest images
    print_status "Pulling latest base images..."
    docker-compose pull
    
    # Build services
    print_status "Building application images..."
    docker-compose build --no-cache
    
    # Start services
    print_status "Starting services..."
    docker-compose up -d
    
    print_status "Services started successfully ✓"
}

# Check service health
check_health() {
    print_header "Checking Service Health"
    
    # Wait for services to start
    print_status "Waiting for services to initialize..."
    sleep 30
    
    # Check backend health
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        print_status "Backend service is healthy ✓"
    else
        print_error "Backend service health check failed"
        docker-compose logs backend
        exit 1
    fi
    
    # Check frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_status "Frontend service is healthy ✓"
    else
        print_error "Frontend service health check failed"
        docker-compose logs frontend
        exit 1
    fi
    
    # Check database connection
    if docker-compose exec -T mongo mongosh --eval "db.adminCommand('ismaster')" > /dev/null 2>&1; then
        print_status "Database connection is healthy ✓"
    else
        print_warning "Database connection check failed (this might be normal during initialization)"
    fi
}

# Setup SSL certificates (Let's Encrypt)
setup_ssl() {
    print_header "SSL Certificate Setup"
    
    if [ "$1" == "--ssl" ]; then
        print_status "Setting up SSL certificates with Let's Encrypt..."
        
        # Install certbot if not present
        if ! command -v certbot &> /dev/null; then
            print_status "Installing Certbot..."
            sudo apt-get update
            sudo apt-get install -y certbot python3-certbot-nginx
        fi
        
        # Generate certificates
        print_status "Generating SSL certificates..."
        sudo certbot --nginx -d bindisa-agritech.com -d www.bindisa-agritech.com
        
        # Setup auto-renewal
        echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
        
        print_status "SSL certificates configured ✓"
    else
        print_warning "SSL setup skipped. Use --ssl flag to enable HTTPS"
    fi
}

# Initialize database with sample data
init_database() {
    print_header "Database Initialization"
    
    print_status "Creating database indexes..."
    docker-compose exec -T mongo mongosh bindisa-agritech --eval "
        db.users.createIndex({ email: 1 }, { unique: true });
        db.users.createIndex({ role: 1 });
        db.soilanalyses.createIndex({ user: 1, createdAt: -1 });
        db.soilanalyses.createIndex({ 'location.coordinates': '2dsphere' });
        db.chats.createIndex({ user: 1, lastActivity: -1 });
        db.chats.createIndex({ sessionId: 1 });
        print('Database indexes created successfully');
    "
    
    print_status "Database initialized ✓"
}

# Setup monitoring and logging
setup_monitoring() {
    print_header "Monitoring Setup"
    
    # Create log directories
    sudo mkdir -p /var/log/bindisa-agritech
    sudo chown -R $USER:$USER /var/log/bindisa-agritech
    
    # Setup log rotation
    sudo tee /etc/logrotate.d/bindisa-agritech > /dev/null <<EOF
/var/log/bindisa-agritech/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}
EOF
    
    print_status "Monitoring and logging configured ✓"
}

# Display deployment summary
show_summary() {
    print_header "Deployment Summary"
    
    echo ""
    print_status "🎉 Bindisa Agritech deployed successfully!"
    echo ""
    print_status "📱 Application URLs:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:5000"
    echo "   API Documentation: http://localhost:5000/api/docs"
    echo ""
    print_status "🔧 Management Commands:"
    echo "   View logs: docker-compose logs -f [service]"
    echo "   Stop services: docker-compose down"
    echo "   Restart services: docker-compose restart"
    echo "   Update services: docker-compose pull && docker-compose up -d"
    echo ""
    print_status "📊 Monitoring:"
    echo "   Service status: docker-compose ps"
    echo "   Resource usage: docker stats"
    echo "   Database: docker-compose exec mongo mongosh"
    echo ""
    print_warning "⚠️  Important:"
    echo "   - Backup your database regularly"
    echo "   - Monitor disk space and logs"
    echo "   - Keep environment variables secure"
    echo "   - Update SSL certificates before expiry"
    echo ""
}

# Cleanup function
cleanup() {
    if [ $? -ne 0 ]; then
        print_error "Deployment failed! Cleaning up..."
        docker-compose down
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main deployment flow
main() {
    print_header "Bindisa Agritech Production Deployment"
    
    # Pre-deployment checks
    check_docker
    check_environment
    
    # Load environment variables
    export $(cat .env | grep -v '^#' | xargs)
    validate_env
    
    # Deploy services
    deploy_services
    
    # Post-deployment setup
    check_health
    init_database
    setup_monitoring
    
    # Optional SSL setup
    setup_ssl $1
    
    # Show summary
    show_summary
    
    print_status "✅ Deployment completed successfully!"
}

# Parse command line arguments
case "$1" in
    --help|-h)
        echo "Bindisa Agritech Deployment Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --ssl          Enable SSL certificate setup"
        echo "  --help, -h     Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0             Deploy without SSL"
        echo "  $0 --ssl       Deploy with SSL certificates"
        exit 0
        ;;
    *)
        main $1
        ;;
esac
