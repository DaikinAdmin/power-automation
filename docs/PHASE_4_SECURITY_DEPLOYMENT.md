# Phase 4: Security & Access Control - Deployment Guide

This guide covers the deployment of secure Grafana access for the Power Automation logging system.

## ✅ Completed Configuration

### 1. Grafana Security Configuration
- ✅ Custom `grafana.ini` with security hardening
- ✅ Anonymous access disabled
- ✅ Secure admin credentials in `.env`
- ✅ Secret key for cookie signing
- ✅ Security headers configured
- ✅ User signups disabled

### 2. Nginx Reverse Proxy Configuration
- ✅ HTTPS configuration ready
- ✅ HTTP to HTTPS redirect
- ✅ WebSocket support for live logs
- ✅ Rate limiting for login endpoint (5 req/min)
- ✅ Security headers (HSTS, CSP, X-Frame-Options, etc.)
- ✅ IP whitelisting ready (commented, easy to enable)

## 🚀 Deployment Steps

### Step 1: Restart Grafana with New Configuration

```bash
# Restart Grafana to apply new security settings
docker-compose restart grafana

# Verify Grafana is running with new config
docker-compose logs grafana | tail -20
```

### Step 2: Test Local Access

```bash
# Open Grafana in browser
open http://localhost:3030

# Login credentials:
# Username: admin
# Password: PowerAutomation2026!
```

Verify:
- [ ] Login works with credentials from `.env`
- [ ] Dashboards are visible
- [ ] Can query Loki datasource
- [ ] Anonymous access is blocked

### Step 3: Set Up DNS (On VPS)

Add DNS A record for logs subdomain:
```
Type: A
Name: logs
Value: YOUR_VPS_IP_ADDRESS
TTL: 300
```

Verify DNS propagation:
```bash
dig logs.powerautomation.pl
nslookup logs.powerautomation.pl
```

### Step 4: Install Certbot (On VPS)

```bash
# Install Certbot for Let's Encrypt
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Or for CentOS/RHEL:
sudo yum install epel-release -y
sudo yum install certbot python3-certbot-nginx -y
```

### Step 5: Deploy Nginx Configuration (On VPS)

```bash
# Copy Nginx config to VPS
scp nginx/logs.powerautomation.pl.conf user@your-vps:/tmp/

# On VPS, move to Nginx sites-available
sudo mv /tmp/logs.powerautomation.pl.conf /etc/nginx/sites-available/logs.powerautomation.pl

# Create symlink to enable site
sudo ln -s /etc/nginx/sites-available/logs.powerautomation.pl /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t
```

### Step 6: Obtain SSL Certificate (On VPS)

```bash
# Obtain certificate for logs subdomain
sudo certbot --nginx -d logs.powerautomation.pl

# Follow prompts:
# - Enter email address
# - Agree to terms of service
# - Choose whether to redirect HTTP to HTTPS (recommended: yes)

# Certbot will automatically configure Nginx and obtain certificate
```

Alternative: Manual certificate (if nginx plugin doesn't work):
```bash
# Stop Nginx temporarily
sudo systemctl stop nginx

# Obtain certificate using standalone mode
sudo certbot certonly --standalone -d logs.powerautomation.pl

# Start Nginx
sudo systemctl start nginx
```

### Step 7: Configure Auto-Renewal (On VPS)

```bash
# Test certificate renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal (runs twice daily)
sudo crontab -e

# Add this line:
0 0,12 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

### Step 8: Update Nginx Config with Certificate Paths (On VPS)

If using manual certificate, update paths in `/etc/nginx/sites-available/logs.powerautomation.pl`:

```nginx
ssl_certificate /etc/letsencrypt/live/logs.powerautomation.pl/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/logs.powerautomation.pl/privkey.pem;
ssl_trusted_certificate /etc/letsencrypt/live/logs.powerautomation.pl/chain.pem;
```

### Step 9: Enable IP Whitelisting (Optional but Recommended)

Edit `/etc/nginx/sites-available/logs.powerautomation.pl`:

```nginx
# Uncomment and add your IP addresses
allow 123.123.123.123;  # Office IP
allow 124.124.124.124;  # Home IP
deny all;
```

Find your current IP:
```bash
curl ifconfig.me
```

### Step 10: Reload Nginx (On VPS)

```bash
# Test configuration
sudo nginx -t

# Reload Nginx to apply changes
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx
```

### Step 11: Update Grafana Domain (On VPS)

Update `.env` on VPS:
```env
GRAFANA_ADMIN_USER="admin"
GRAFANA_ADMIN_PASSWORD="PowerAutomation2026!"
GRAFANA_SECRET_KEY="SW2YcwTIb9zpODdwmrk7S8NVzP6i5WsX"
```

Restart Grafana:
```bash
docker-compose restart grafana
```

### Step 12: Verify HTTPS Access

```bash
# Test HTTPS redirect
curl -I http://logs.powerautomation.pl

# Should return: HTTP/1.1 301 Moved Permanently
# Location: https://logs.powerautomation.pl/

# Test HTTPS access
curl -I https://logs.powerautomation.pl

# Should return: HTTP/2 200
```

In browser:
1. Navigate to `https://logs.powerautomation.pl`
2. Verify SSL certificate is valid (green padlock)
3. Login with admin credentials
4. Check that dashboards load correctly

### Step 13: Configure Firewall (On VPS)

```bash
# Allow HTTPS traffic
sudo ufw allow 443/tcp

# Allow HTTP (for Let's Encrypt challenges)
sudo ufw allow 80/tcp

# Block direct Grafana access from outside
sudo ufw deny 3030/tcp

# Apply rules
sudo ufw reload

# Check status
sudo ufw status
```

## 🔐 Security Checklist

- [x] Strong admin password set
- [x] Anonymous access disabled
- [x] User signups disabled
- [x] SSL/TLS certificate installed
- [x] HTTPS enforced with redirect
- [x] Security headers enabled (HSTS, CSP, etc.)
- [x] Rate limiting on login endpoint
- [ ] IP whitelisting enabled (optional)
- [x] Direct port access blocked by firewall
- [x] Certificate auto-renewal configured

## 🔍 Troubleshooting

### Issue: Certificate Validation Failed

```bash
# Check DNS resolution
nslookup logs.powerautomation.pl

# Verify port 80 is accessible
curl -I http://logs.powerautomation.pl/.well-known/acme-challenge/test

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Issue: Can't Access Grafana

```bash
# Check Grafana is running
docker-compose ps grafana

# Check Grafana logs
docker-compose logs grafana

# Check Nginx status
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Issue: WebSocket Connection Failed

```bash
# Verify WebSocket proxy settings in Nginx
sudo nginx -T | grep -A 10 "location /api/live"

# Check browser console for WebSocket errors
# Make sure Connection header is set to "upgrade"
```

### Issue: 403 Forbidden

```bash
# Check if your IP is whitelisted (if enabled)
curl ifconfig.me

# Temporarily disable IP whitelisting to test
# Comment out allow/deny lines in Nginx config
```

## 📊 Monitoring Security

### Check Failed Login Attempts

In Grafana, go to **Server Admin** → **Users** → Check last login times

### Monitor Nginx Access Logs

```bash
# Watch access logs
sudo tail -f /var/log/nginx/grafana-access.log

# Count requests by IP
sudo cat /var/log/nginx/grafana-access.log | awk '{print $1}' | sort | uniq -c | sort -rn

# Check for suspicious patterns
sudo grep "401\|403\|404" /var/log/nginx/grafana-access.log
```

### SSL Certificate Expiry

```bash
# Check certificate expiry date
sudo certbot certificates

# Should renew automatically 30 days before expiry
```

## 🔄 Maintenance

### Update Admin Password

```bash
# On VPS, update .env
nano .env

# Change GRAFANA_ADMIN_PASSWORD

# Restart Grafana
docker-compose restart grafana
```

### Add New IP to Whitelist

```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/logs.powerautomation.pl

# Add new allow line
allow 125.125.125.125;

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

### Rotate Secret Key

```bash
# Generate new secret key
openssl rand -base64 32

# Update .env
nano .env

# Update GRAFANA_SECRET_KEY

# Restart Grafana (will invalidate existing sessions)
docker-compose restart grafana
```

## 📚 Next Steps

After completing Phase 4, proceed to:
- **Phase 5:** Deployment & Testing
- **Phase 6:** Monitoring & Alerts

## 🆘 Support Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Grafana Security Guide](https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/)
