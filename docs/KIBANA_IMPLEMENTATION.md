# Kibana-like Logging Implementation Plan for Power Automation VPS

## 📋 Executive Summary

This document outlines the implementation plan for a centralized logging infrastructure for the Power Automation Next.js application running on VPS. The solution provides web-based log visualization and search capabilities similar to Kibana + Elasticsearch.

## 🎯 Objectives

- Centralized logging for all application components (Next.js app, PostgreSQL, Docker containers)
- Web-based UI for log viewing, searching, and analysis
- Real-time log streaming
- Log retention and rotation policies
- Minimal performance impact on the application
- Cost-effective solution suitable for VPS deployment

## 📊 Architecture Options

### Option 1: ELK Stack (Elasticsearch + Logstash + Kibana) - Full Featured
**Resource Requirements:** ~2-4 GB RAM minimum

**Pros:**
- Industry standard
- Powerful search capabilities
- Rich visualization options
- Extensive plugin ecosystem

**Cons:**
- Heavy resource consumption (not ideal for small VPS)
- Complex setup and maintenance
- Requires significant RAM and disk space

### Option 2: Grafana Loki + Promtail + Grafana - **RECOMMENDED**
**Resource Requirements:** ~512 MB - 1 GB RAM

**Pros:**
- Lightweight and VPS-friendly
- Excellent performance
- Cost-effective storage
- Easy Docker integration
- Beautiful Grafana UI
- Prometheus integration for metrics

**Cons:**
- Less powerful full-text search than Elasticsearch
- Smaller ecosystem than ELK

### Option 3: Graylog + MongoDB + Elasticsearch - Alternative
**Resource Requirements:** ~2-3 GB RAM

**Pros:**
- Modern web UI
- Good search capabilities
- Active development

**Cons:**
- Still resource-intensive
- Requires multiple components

### Option 4: Dozzle - Lightweight Docker-only
**Resource Requirements:** ~50 MB RAM

**Pros:**
- Extremely lightweight
- Real-time Docker log viewer
- No external dependencies
- Easy setup (single container)

**Cons:**
- No log persistence
- Limited search capabilities
- Docker containers only
- No advanced analytics

## 🏗️ Recommended Implementation: Grafana Loki Stack

Based on VPS constraints and project requirements, we recommend **Grafana Loki + Promtail + Grafana**.

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Grafana (Web UI)                     │
│              http://your-domain.com:3030                │
└─────────────────────┬───────────────────────────────────┘
                      │ Query Logs
┌─────────────────────▼───────────────────────────────────┐
│                    Loki (Log Store)                      │
│          Indexes labels, stores log chunks              │
└─────────────────────▲───────────────────────────────────┘
                      │ Push Logs
┌─────────────────────┴───────────────────────────────────┐
│                  Promtail (Log Collector)                │
│     Collects & ships logs from various sources          │
└─────────────────────▲───────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼────┐    ┌───────▼────┐    ┌──────▼─────┐
│Next.js │    │ PostgreSQL │    │   Docker   │
│  Logs  │    │    Logs    │    │   Daemon   │
└────────┘    └────────────┘    └────────────┘
```

## 📦 Implementation Plan

### Phase 1: Infrastructure Setup (Day 1-2)

#### Step 1.1: Update Docker Compose Configuration

Add Loki, Promtail, and Grafana services to your existing `docker-compose.yml`:

```yaml
# Add to existing docker-compose.yml

  # Loki - Log aggregation system
  loki:
    image: grafana/loki:2.9.3
    container_name: powerautomation-loki
    restart: unless-stopped
    ports:
      - "3100:3100"
    volumes:
      - ./loki/config:/etc/loki
      - loki_data:/loki
    command: -config.file=/etc/loki/loki-config.yml
    networks:
      - powerautomation-network
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3100/ready"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Promtail - Log collector
  promtail:
    image: grafana/promtail:2.9.3
    container_name: powerautomation-promtail
    restart: unless-stopped
    volumes:
      - ./loki/promtail-config.yml:/etc/promtail/promtail-config.yml
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./logs:/app/logs:ro  # Application logs
    command: -config.file=/etc/promtail/promtail-config.yml
    networks:
      - powerautomation-network
    depends_on:
      - loki

  # Grafana - Visualization UI
  grafana:
    image: grafana/grafana:10.2.3
    container_name: powerautomation-grafana
    restart: unless-stopped
    ports:
      - "3030:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_ADMIN_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=%(protocol)s://%(domain)s:%(http_port)s/grafana/
      - GF_SERVER_SERVE_FROM_SUB_PATH=true
    volumes:
      - grafana_data:/var/lib/grafana
      - ./loki/grafana-datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml
      - ./loki/grafana-dashboards.yml:/etc/grafana/provisioning/dashboards/dashboards.yml
      - ./loki/dashboards:/var/lib/grafana/dashboards
    networks:
      - powerautomation-network
    depends_on:
      - loki

volumes:
  postgres_data:
  loki_data:
  grafana_data:

networks:
  powerautomation-network:
    driver: bridge
```

#### Step 1.2: Configure Application Logging

Update Next.js to write logs to files that Promtail can collect:

```typescript
// src/lib/logger.ts
import winston from 'winston';
import path from 'path';

const logDir = process.env.LOG_DIR || 'logs';

// Create Winston logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'power-automation',
    environment: process.env.NODE_ENV 
  },
  transports: [
    // Console for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Error logs
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Combined logs
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Access logs
    new winston.transports.File({ 
      filename: path.join(logDir, 'access.log'),
      level: 'http',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  ]
});

// HTTP request logging middleware for Next.js
export function logRequest(req: Request, res: Response, duration: number) {
  logger.http('HTTP Request', {
    method: req.method,
    url: req.url,
    status: res.status,
    duration,
    userAgent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
  });
}

export default logger;
```

#### Step 1.3: Create Loki Configuration Files

Create directory structure:
```bash
mkdir -p loki/config
mkdir -p loki/dashboards
mkdir -p logs
```

**File: `loki/config/loki-config.yml`**

```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096
  log_level: info

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    cache_ttl: 24h
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

compactor:
  working_directory: /loki/boltdb-shipper-compactor
  shared_store: filesystem
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150

limits_config:
  retention_period: 744h  # 31 days
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  ingestion_rate_mb: 10
  ingestion_burst_size_mb: 20
  max_entries_limit_per_query: 5000
  max_cache_freshness_per_query: 10m

chunk_store_config:
  max_look_back_period: 744h  # 31 days

table_manager:
  retention_deletes_enabled: true
  retention_period: 744h  # 31 days

query_range:
  align_queries_with_step: true
  max_retries: 5
  cache_results: true
```

**File: `loki/promtail-config.yml`**

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0
  log_level: info

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Docker containers logs
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'stream'
      - source_labels: ['__meta_docker_container_label_com_docker_compose_service']
        target_label: 'service'

  # Next.js application logs
  - job_name: nextjs
    static_configs:
      - targets:
          - localhost
        labels:
          job: nextjs
          __path__: /app/logs/*.log
    pipeline_stages:
      - json:
          expressions:
            timestamp: timestamp
            level: level
            message: message
            service: service
      - labels:
          level:
          service:
      - timestamp:
          source: timestamp
          format: RFC3339

  # System logs
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          __path__: /var/log/*.log
```

**File: `loki/grafana-datasources.yml`**

```yaml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: true
    version: 1
    editable: true
    jsonData:
      maxLines: 1000
      derivedFields:
        - datasourceUid: loki
          matcherRegex: "traceID=(\\w+)"
          name: TraceID
          url: "$${__value.raw}"
```

**File: `loki/grafana-dashboards.yml`**

```yaml
apiVersion: 1

providers:
  - name: 'Power Automation Logs'
    orgId: 1
    folder: 'Logs'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: true
```

### Phase 2: Application Integration (Day 2-3)

#### Step 2.1: Add Logging Dependencies

```bash
npm install winston winston-daily-rotate-file
npm install --save-dev @types/winston
```

Update `package.json`:
```json
{
  "dependencies": {
    "winston": "^3.11.0",
    "winston-daily-rotate-file": "^4.7.1"
  }
}
```

#### Step 2.2: Create Logging Middleware

**File: `src/middleware/logging.ts`**

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import logger from '@/lib/logger';

export function loggingMiddleware(request: NextRequest) {
  const startTime = Date.now();
  
  // Log incoming request
  logger.http('Incoming request', {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers),
    ip: request.ip || request.headers.get('x-forwarded-for')
  });

  const response = NextResponse.next();

  // Log response
  const duration = Date.now() - startTime;
  logger.http('Request completed', {
    method: request.method,
    url: request.url,
    status: response.status,
    duration
  });

  return response;
}
```

#### Step 2.3: Add Error Logging

**File: `src/lib/error-handler.ts`**

```typescript
import logger from './logger';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function logError(error: Error | AppError, context?: Record<string, any>) {
  const errorLog = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...context
  };

  if (error instanceof AppError) {
    errorLog.statusCode = error.statusCode;
    errorLog.isOperational = error.isOperational;
  }

  logger.error('Application error', errorLog);
}

// API route error handler
export function apiErrorHandler(error: Error, req: Request) {
  logError(error, {
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers)
  });

  if (error instanceof AppError) {
    return Response.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }

  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

#### Step 2.4: Update API Routes

Example of adding logging to an API route:

```typescript
// src/app/api/example/route.ts
import { NextRequest } from 'next/server';
import logger from '@/lib/logger';
import { apiErrorHandler } from '@/lib/error-handler';

export async function GET(req: NextRequest) {
  try {
    logger.info('Processing example request', {
      searchParams: Object.fromEntries(req.nextUrl.searchParams)
    });

    // Your logic here
    const result = { data: 'example' };

    logger.info('Example request completed successfully');
    return Response.json(result);

  } catch (error) {
    return apiErrorHandler(error as Error, req);
  }
}
```

### Phase 3: Grafana Dashboard Setup (Day 3-4)

#### Step 3.1: Create Pre-configured Dashboards

**File: `loki/dashboards/power-automation-overview.json`**

This will be a comprehensive JSON dashboard config. Here's the structure:

```json
{
  "dashboard": {
    "title": "Power Automation - Application Overview",
    "tags": ["power-automation", "logs", "overview"],
    "timezone": "browser",
    "panels": [
      {
        "title": "Error Rate (Last 1h)",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate({job=\"nextjs\", level=\"error\"}[1h]))",
            "refId": "A"
          }
        ]
      },
      {
        "title": "Recent Errors",
        "type": "logs",
        "targets": [
          {
            "expr": "{job=\"nextjs\", level=\"error\"}",
            "refId": "A"
          }
        ]
      },
      {
        "title": "Request Volume",
        "type": "graph",
        "targets": [
          {
            "expr": "rate({job=\"nextjs\", level=\"http\"}[5m])",
            "refId": "A"
          }
        ]
      },
      {
        "title": "Container Logs",
        "type": "logs",
        "targets": [
          {
            "expr": "{job=\"docker\"}",
            "refId": "A"
          }
        ]
      }
    ]
  }
}
```

### Phase 4: Security & Access Control (Day 4)

#### Step 4.1: Secure Grafana

1. **Change default credentials** in `.env`:
```env
GRAFANA_ADMIN_USER=your_admin_username
GRAFANA_ADMIN_PASSWORD=your_secure_password
```

2. **Set up reverse proxy** with Nginx for SSL:

Add Grafana path to your existing Nginx configuration for `powerautomation.pl`:

```nginx
# /etc/nginx/sites-available/powerautomation.pl
server {
    listen 443 ssl http2;
    server_name powerautomation.pl;

    ssl_certificate /etc/letsencrypt/live/powerautomation.pl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/powerautomation.pl/privkey.pem;

    # ... your existing Next.js application proxy configuration ...

    # Grafana logs interface at https://powerautomation.pl/grafana
    location /grafana/ {
        proxy_pass http://localhost:3030/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support for live logs
    location /grafana/api/live/ {
        proxy_pass http://localhost:3030/api/live/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Access Grafana at:** `https://powerautomation.pl/grafana`

> **Note:** Your Docker Compose already has Grafana configured with `GF_SERVER_SERVE_FROM_SUB_PATH=true` and `GF_SERVER_ROOT_URL=%(protocol)s://%(domain)s:%(http_port)s/grafana/`, which enables path-based routing.

#### Step 4.2: Implement IP Whitelisting

Add to Nginx config:
```nginx
# Allow only specific IPs
allow 123.123.123.123;  # Your office IP
deny all;
```

Or in Grafana config (`loki/grafana.ini`):
```ini
[auth.anonymous]
enabled = false

[security]
admin_user = admin
admin_password = $__env{GRAFANA_ADMIN_PASSWORD}
```

### Phase 5: Deployment & Testing (Day 5)

#### Step 5.1: Deploy to VPS

```bash
# 1. Create logs directory
mkdir -p logs

# 2. Update environment variables
cp .env.example .env
# Edit .env with Grafana credentials

# 3. Pull images
docker-compose pull loki promtail grafana

# 4. Start logging stack
docker-compose up -d loki promtail grafana

# 5. Verify services
docker-compose ps
docker-compose logs -f loki
docker-compose logs -f promtail
docker-compose logs -f grafana

# 6. Test connectivity
curl http://localhost:3100/ready  # Loki
curl http://localhost:3030        # Grafana
```

#### Step 5.2: Verify Log Collection

```bash
# Check if Promtail is collecting logs
docker-compose exec promtail cat /tmp/positions.yaml

# Generate test logs
docker-compose logs app

# Check Loki ingestion
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={job="docker"}' | jq
```

#### Step 5.3: Access Grafana

1. Navigate to `http://your-vps-ip:3030`
2. Login with credentials from `.env`
3. Go to **Explore** → Select **Loki** datasource
4. Test query: `{job="nextjs"}`

### Phase 6: Monitoring & Alerts (Day 6-7)

#### Step 6.1: Create Alerting Rules

**File: `loki/rules/alerts.yml`**

```yaml
groups:
  - name: power_automation_alerts
    interval: 1m
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate({job="nextjs", level="error"}[5m])) > 10
        for: 5m
        labels:
          severity: critical
          service: power-automation
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

      - alert: ApplicationDown
        expr: |
          absent(up{job="nextjs"})
        for: 2m
        labels:
          severity: critical
          service: power-automation
        annotations:
          summary: "Application is down"
          description: "Power Automation application has been down for 2 minutes"

      - alert: DatabaseConnectionErrors
        expr: |
          sum(rate({job="nextjs"} |= "database" |= "error"[5m])) > 5
        for: 5m
        labels:
          severity: warning
          service: power-automation
        annotations:
          summary: "Database connection errors detected"
          description: "Database connection error rate: {{ $value }} errors/sec"
```

#### Step 6.2: Configure Notification Channels

In Grafana UI:
1. Go to **Alerting** → **Contact points**
2. Add email/Slack/Discord notification channel
3. Test notification

## 🔧 Maintenance & Operations

### Log Retention Policy

Logs are retained for 31 days by default. Adjust in `loki-config.yml`:

```yaml
limits_config:
  retention_period: 744h  # Change as needed (744h = 31 days)
```

### Backup Strategy

```bash
# Backup Grafana dashboards and settings
docker-compose exec grafana grafana-cli admin export /tmp/backup.json
docker-compose cp grafana:/tmp/backup.json ./backups/grafana-$(date +%Y%m%d).json

# Backup Loki data
tar -czf loki-backup-$(date +%Y%m%d).tar.gz loki_data/
```

### Performance Tuning

#### For VPS with 2-4 GB RAM:

```yaml
# loki-config.yml adjustments
limits_config:
  ingestion_rate_mb: 4
  ingestion_burst_size_mb: 6
  max_entries_limit_per_query: 1000
```

#### For VPS with 4-8 GB RAM:

```yaml
limits_config:
  ingestion_rate_mb: 10
  ingestion_burst_size_mb: 20
  max_entries_limit_per_query: 5000
```

### Monitoring Disk Usage

```bash
# Check Loki storage
du -sh loki_data/

# Monitor disk usage
docker-compose exec loki du -sh /loki/*

# Clean old logs if needed
docker-compose exec loki rm -rf /loki/chunks/fake/*
```

## 📊 Common Log Queries

### LogQL Query Examples

```logql
# All error logs from Next.js
{job="nextjs", level="error"}

# Last 1 hour of application logs
{job="nextjs"} |= "" | line_format "{{.timestamp}} [{{.level}}] {{.message}}"

# Filter by specific error message
{job="nextjs"} |= "database connection"

# Count errors per minute
sum(rate({job="nextjs", level="error"}[1m]))

# Slow requests (duration > 1000ms)
{job="nextjs", level="http"} | json | duration > 1000

# Database errors
{job="docker", container="powerautomation-postgres"}

# Specific container logs
{container="powerautomation-app"}

# Multiple conditions
{job="nextjs"} |= "error" |~ "database|connection"

# Exclude health checks
{job="nextjs", level="http"} != "/api/health"
```

## 🎛️ Alternative: Quick Start with Dozzle (Lightweight Option)

If VPS resources are very limited (<1GB RAM), use Dozzle for Docker-only logging:

```yaml
# Add to docker-compose.yml
  dozzle:
    image: amir20/dozzle:latest
    container_name: powerautomation-dozzle
    restart: unless-stopped
    ports:
      - "8888:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - DOZZLE_LEVEL=info
      - DOZZLE_TAILSIZE=300
      - DOZZLE_FILTER=status=running
```

Access at `http://your-vps-ip:8888` (secure with Nginx + auth)

## ✅ Success Criteria

- [ ] All Docker containers send logs to Loki
- [ ] Application logs are collected and searchable
- [ ] Grafana dashboard shows real-time logs
- [ ] Alerts are configured and tested
- [ ] SSL/TLS enabled for Grafana access
- [ ] Log retention policy is active
- [ ] Backup procedure is documented and tested
- [ ] Team can access and search logs via web UI

## 📚 Additional Resources

- [Grafana Loki Documentation](https://grafana.com/docs/loki/latest/)
- [Promtail Configuration](https://grafana.com/docs/loki/latest/clients/promtail/configuration/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Grafana Alerting](https://grafana.com/docs/grafana/latest/alerting/)
- [Winston Logger (Node.js)](https://github.com/winstonjs/winston)

## 🐛 Troubleshooting

### Issue: Promtail not collecting logs
```bash
# Check Promtail config
docker-compose exec promtail cat /etc/promtail/promtail-config.yml

# Check positions file
docker-compose exec promtail cat /tmp/positions.yaml

# Restart Promtail
docker-compose restart promtail
```

### Issue: Loki out of memory
```bash
# Check memory usage
docker stats loki

# Reduce retention or query limits in loki-config.yml
# Restart Loki
docker-compose restart loki
```

### Issue: Can't access Grafana
```bash
# Check if Grafana is running
docker-compose ps grafana

# Check logs
docker-compose logs grafana

# Verify port binding
netstat -tlnp | grep 3030
```

## 💰 Cost Estimate

### VPS Requirements:
- **Minimal Setup (Dozzle):** 512 MB RAM, 5 GB disk
- **Recommended Setup (Loki):** 2 GB RAM, 20 GB disk
- **Full Setup (Loki + long retention):** 4 GB RAM, 50 GB disk

### Monthly Costs:
- VPS upgrade (if needed): €5-15/month
- SSL Certificate: Free (Let's Encrypt)
- Maintenance time: 2-4 hours/month

## 🚀 Next Steps

1. **Week 1:** Implement Phase 1-3 (Infrastructure + Integration)
2. **Week 2:** Implement Phase 4-6 (Security + Deployment + Monitoring)
3. **Week 3:** Training and documentation for team
4. **Week 4:** Monitor and optimize performance

## 📝 Notes

- Start with Grafana Loki for balance of features and resource usage
- Test on staging environment first
- Monitor VPS resource usage after deployment
- Consider upgrading VPS if resource-constrained
- Implement log rotation to prevent disk full
- Regular backup of Grafana dashboards and Loki configuration

---

**Document Version:** 1.0  
**Last Updated:** January 17, 2026  
**Prepared for:** Power Automation VPS Logging Infrastructure
