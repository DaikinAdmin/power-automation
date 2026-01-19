# Loki Logging Configuration

This directory contains configuration files for the Grafana Loki logging stack.

## Structure

```
loki/
├── config/
│   └── loki-config.yml          # Loki server configuration
├── promtail-config.yml          # Promtail log collector configuration
├── grafana-datasources.yml      # Grafana datasource auto-provisioning
├── grafana-dashboards.yml       # Grafana dashboard auto-provisioning
└── dashboards/                  # Custom Grafana dashboards (JSON)
```

## Configuration Files

### loki-config.yml
- Log retention: 31 days (744h)
- Storage: Local filesystem
- Ingestion rate: 10 MB/s
- Max query entries: 5000

### promtail-config.yml
Collects logs from:
- Docker containers (auto-discovery)
- Next.js application logs (`/app/logs/*.log`)
- System logs (`/var/log/syslog`)

### grafana-datasources.yml
Auto-configures Loki as the default datasource in Grafana.

### grafana-dashboards.yml
Auto-loads dashboards from the `dashboards/` directory.

## Accessing Logs

1. **Grafana UI**: http://localhost:3030 (or your domain)
   - Username: from `GRAFANA_ADMIN_USER` env variable
   - Password: from `GRAFANA_ADMIN_PASSWORD` env variable

2. **Loki API**: http://localhost:3100

## Common LogQL Queries

```logql
# All error logs
{job="nextjs", level="error"}

# Last 1 hour of logs
{job="nextjs"} |= "" 

# Docker container logs
{container="powerautomation-app"}

# Database errors
{job="docker", service="postgres"}

# HTTP requests
{job="nextjs", level="http"}
```

## Customization

### Adjust Log Retention

Edit `loki-config.yml`:
```yaml
limits_config:
  retention_period: 720h  # Change to desired hours
```

### Add More Log Sources

Edit `promtail-config.yml` and add new `scrape_configs`.

### Performance Tuning

For limited VPS resources, reduce in `loki-config.yml`:
```yaml
limits_config:
  ingestion_rate_mb: 4
  max_entries_limit_per_query: 1000
```

## Troubleshooting

### Check if Loki is running
```bash
docker-compose ps loki
curl http://localhost:3100/ready
```

### Check Promtail logs
```bash
docker-compose logs promtail
```

### Verify log collection
```bash
docker-compose exec promtail cat /tmp/positions.yaml
```

## Backup

To backup Grafana dashboards:
```bash
docker-compose exec grafana grafana-cli admin export /tmp/backup.json
docker-compose cp grafana:/tmp/backup.json ./backups/grafana-backup.json
```
