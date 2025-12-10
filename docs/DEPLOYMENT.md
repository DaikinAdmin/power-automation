# daikin Docker Deployment Guide

This guide will help you deploy the daikin application on your VPS using Docker and Docker Compose.

## Prerequisites

- VPS with Ubuntu 20.04+ (or similar Linux distribution)
- Root or sudo access
- Domain name pointed to your VPS IP address
- At least 2GB RAM and 20GB storage

## Step 1: Install Docker and Docker Compose

SSH into your VPS and run:

### Method 1: Official Docker Installation Script (Recommended)

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Download and run Docker's official installation script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (optional, to run docker without sudo)
sudo usermod -aG docker $USER

# Clean up
rm get-docker.sh

# Log out and log back in for group changes to take effect
```

### Method 2: Manual Installation (if Method 1 fails)

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Remove old versions if they exist
sudo apt remove -y docker docker-engine docker.io containerd runc

# Install required packages
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package index
sudo apt update

# Install Docker Engine
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and log back in for group changes to take effect
```

### Method 3: For Debian/Other Distributions

If you're using Debian or another distribution, replace the repository URL:

```bash
# For Debian
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### Verify Installation

```bash
# Check Docker version
docker --version

# Check Docker Compose version
docker compose version

# Test Docker installation
sudo docker run hello-world
```

## Step 2: Clone Your Repository

```bash
# Create app directory
mkdir -p /opt/daikin
cd /opt/daikin

# Clone your repository
git clone https://github.com/DaikinAdmin/daikin.git .
# OR upload your files using scp/rsync
```

## Step 3: Configure Environment Variables

```bash
# Copy the production environment template
cp .env.production .env

# Edit the .env file with your production values
nano .env
```

Update the following critical values in `.env`:

```env
# Generate a secure password for the database
DB_PASSWORD=<generate_strong_password>

# Generate a secure secret for auth (run: openssl rand -base64 32)
BETTER_AUTH_SECRET=<your_generated_secret>

# Update with your domain
BETTER_AUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
BASE_URL=https://your-domain.com

# Keep your existing credentials for Cloudinary and Mail
```

To generate secure secrets:
```bash
# For database password
openssl rand -base64 32

# For auth secret
openssl rand -base64 32
```

## Step 4: Update Next.js Configuration

Update `next.config.ts` to enable standalone output for Docker:

```typescript
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: 'standalone', // Add this line
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  images: {
    domains: ['res.cloudinary.com'],
  },
  env: {
    BASE_URL: process.env.BASE_URL,
    ADMIN_USER_ID: process.env.ADMIN_USER_ID,
  },
};

export default withNextIntl(nextConfig);
```

## Step 5: Build and Run with Docker Compose

```bash
# Build and start the containers
docker compose up -d --build

# Check if containers are running
docker compose ps

# View logs
docker compose logs -f app
docker compose logs -f postgres
```

## Step 6: Run Database Migrations

```bash
# Wait for the containers to be fully up (about 30 seconds)
sleep 30

# Run Prisma migrations
docker compose exec app npx prisma migrate deploy

# Seed the database (optional)
docker compose exec app npx prisma db seed
```

## Step 7: Set Up SSL with Nginx (Recommended)

Install Nginx as a reverse proxy:

```bash
# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/daikin
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name daikinkobierzyce.pl www.daikinkobierzyce.pl;

    location / {
        proxy_pass http://localhost:3030;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 50M;
}
```

Enable the site and get SSL certificate:

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/daikin /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d daikinkobierzyce.pl -d www.daikinkobierzyce.pl

# Certbot will automatically configure SSL and set up auto-renewal
```

## Step 8: Configure Firewall

```bash
# Enable UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

## Useful Commands

### Managing Containers

```bash
# Stop containers
docker compose down

# Start containers
docker compose up -d

# Restart containers
docker compose restart

# View logs
docker compose logs -f app
docker compose logs -f postgres

# Execute commands in app container
docker compose exec app npm run build
docker compose exec app npx prisma studio

# Execute commands in postgres container
docker compose exec postgres psql -U daikin -d daikin
```

### Database Operations

```bash
# Backup database
docker compose exec postgres pg_dump -U daikin daikin > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
cat backup.sql | docker compose exec -T postgres psql -U daikin -d daikin

# Run migrations
docker compose exec app npx prisma migrate deploy

# Reset database (CAUTION: This will delete all data!)
docker compose exec app npx prisma migrate reset --force
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose up -d --build

# Run migrations if needed
docker compose exec app npx prisma migrate deploy
```

### Monitoring

```bash
# Check container resource usage
docker stats

# Check container health
docker compose ps

# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f app
docker compose logs -f postgres
```

## Backup Strategy

### Automated Daily Backups

Create a backup script:

```bash
sudo nano /usr/local/bin/backup-daikin.sh
```

Add this content:

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/daikin"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker compose -f /opt/daikin/docker-compose.yml exec -T postgres pg_dump -U daikin daikin | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make it executable and add to cron:

```bash
sudo chmod +x /usr/local/bin/backup-daikin.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add this line:
0 2 * * * /usr/local/bin/backup-daikin.sh >> /var/log/daikin-backup.log 2>&1
```

## Troubleshooting

### Container won't start
```bash
docker compose logs app
docker compose logs postgres
```

### Database connection issues
```bash
# Check if postgres is healthy
docker compose ps

# Check database connectivity
docker compose exec postgres pg_isready -U daikin
```

### Out of memory
```bash
# Check memory usage
free -h
docker stats

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Permission issues
```bash
# Fix ownership
sudo chown -R $USER:$USER /opt/daikin
```

## Security Considerations

1. **Keep secrets secure**: Never commit `.env` file to git
2. **Update regularly**: Keep Docker, OS, and dependencies updated
3. **Use strong passwords**: For database and auth secrets
4. **Enable firewall**: Only allow necessary ports (80, 443, 22)
5. **Regular backups**: Automate database backups
6. **Monitor logs**: Check logs regularly for suspicious activity
7. **SSL/TLS**: Always use HTTPS in production

## Support

For issues or questions, check the logs first:
```bash
docker compose logs -f
```

If you need to rebuild from scratch:
```bash
docker compose down -v  # WARNING: This deletes all data!
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```
