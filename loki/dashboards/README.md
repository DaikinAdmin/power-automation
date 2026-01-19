# Grafana Dashboards for Power Automation

This directory contains pre-configured Grafana dashboards for monitoring the Power Automation application using Loki logs.

## Available Dashboards

### 1. Power Automation - Overview
**File:** `power-automation-overview.json`  
**UID:** `power-automation-overview`

Comprehensive system overview dashboard showing:
- Error count (last hour)
- Total requests (last hour)
- Active Docker containers
- Log rate by level
- Request and error rate trends
- Log distribution by container
- Recent errors with details
- Container logs viewer

**Best for:** Quick health check and system status at a glance.

### 2. Power Automation - HTTP Access Logs
**File:** `http-access-logs.json`  
**UID:** `power-automation-http-access`

HTTP request analytics and patterns:
- HTTP requests by method (GET, POST, etc.)
- Top 10 most requested URLs
- Average response time trends
- HTTP status code distribution
- Top client IPs
- Top user agents
- Recent HTTP access logs

**Best for:** Understanding traffic patterns, identifying popular endpoints, and analyzing client behavior.

### 3. Power Automation - Error Analysis
**File:** `error-analysis.json`  
**UID:** `power-automation-error-analysis`

Detailed error investigation and debugging:
- Total errors (last hour and 5 minutes)
- Error rate percentage
- Unique error types count
- Error and warning trends over time
- Error distribution by type
- Top error-prone endpoints
- HTTP error status codes breakdown
- Recent errors with full details
- Recent warnings log

**Best for:** Debugging issues, identifying error patterns, and tracking error-prone endpoints.

### 4. Power Automation - Performance Monitoring
**File:** `performance-monitoring.json`  
**UID:** `power-automation-performance`

Application performance metrics:
- Average response time (5 minutes)
- P95 and P99 response time percentiles
- Request rate (requests/second)
- Response time percentiles over time (P50, P95, P99)
- Request throughput by HTTP method
- Slowest endpoints by average duration
- Most requested endpoints
- Response time heatmap by endpoint
- Slow requests log (>1 second)

**Best for:** Performance optimization, identifying bottlenecks, and monitoring SLAs.

## Dashboard Import

All dashboards are automatically provisioned when you start the Docker Compose stack. They will be available in Grafana at:

**Grafana URL:** http://localhost:3030  
**Username:** admin  
**Password:** PowerAutomation2026!

Navigate to **Dashboards → Browse** to find all Power Automation dashboards.

## Common LogQL Queries

Here are some useful LogQL queries you can use in Grafana Explore or create custom panels:

### Basic Queries

```logql
# All logs from Next.js application
{job="nextjs"}

# Only error level logs
{job="nextjs", level="error"}

# HTTP access logs
{job="nextjs", level="http"}

# Logs from specific container
{container_name="power-automation-app"}
```

### Filtered Queries

```logql
# Logs containing specific text
{job="nextjs"} |= "database"

# Logs NOT containing text
{job="nextjs"} != "health-check"

# Regular expression filter
{job="nextjs"} |~ "error|warning"

# Case-insensitive search
{job="nextjs"} |~ "(?i)error"
```

### JSON Parsing

```logql
# Parse JSON and filter by field
{job="nextjs"} | json | method="POST"

# Extract specific fields
{job="nextjs"} | json | line_format "{{.message}} - {{.url}}"

# Filter by numeric field
{job="nextjs"} | json | status >= 400
```

### Aggregations

```logql
# Count logs over time
count_over_time({job="nextjs"} [5m])

# Rate of logs per second
rate({job="nextjs"} [1m])

# Sum by label
sum by (level) (count_over_time({job="nextjs"} [5m]))

# Average response time
avg_over_time({job="nextjs"} | json | unwrap duration [5m])

# 95th percentile
quantile_over_time(0.95, {job="nextjs"} | json | unwrap duration [5m])
```

### Error Analysis

```logql
# Count errors by type
sum by (errorType) (count_over_time({job="nextjs", level="error"} | json [1h]))

# Top error-prone endpoints
topk(10, sum by (url) (count_over_time({job="nextjs", level="error"} | json [1h])))

# Error rate percentage
sum(count_over_time({level="error"} [5m])) / sum(count_over_time({job="nextjs"} [5m]))
```

### Performance Queries

```logql
# Slow requests (>1 second)
{job="nextjs"} | json | duration > 1000

# Average response time by endpoint
avg by (url) (avg_over_time({job="nextjs"} | json | unwrap duration [5m]))

# Requests per second by method
sum by (method) (rate({job="nextjs", level="http"} | json [1m]))
```

## Dashboard Customization

### Adding Custom Panels

1. Open any dashboard in Grafana
2. Click **Add → Visualization**
3. Select **Loki** as data source
4. Enter your LogQL query
5. Choose visualization type (Graph, Table, Logs, Stat, etc.)
6. Configure panel settings and save

### Creating Alerts

1. Edit a panel in any dashboard
2. Go to **Alert** tab
3. Click **Create alert rule from this panel**
4. Configure conditions and thresholds
5. Set up notification channels
6. Save alert rule

### Dashboard Variables

You can add variables to make dashboards dynamic:

1. Go to **Dashboard settings → Variables**
2. Click **Add variable**
3. Example variable for filtering by endpoint:

```
Name: endpoint
Type: Query
Query: label_values({job="nextjs"}, url)
```

Then use in queries: `{job="nextjs", url="$endpoint"}`

## Time Ranges

All dashboards use relative time ranges:
- **Default:** Last 1 hour
- **Refresh:** Every 30 seconds (10 seconds for Overview)

You can change these in the dashboard settings or time picker.

## Log Retention

- **Loki:** 31 days (744 hours)
- **Winston combined logs:** 14 days
- **Winston access logs:** 7 days

After this period, logs are automatically deleted.

## Troubleshooting

### No data in dashboards

1. Check if containers are running:
   ```bash
   docker-compose ps
   ```

2. Verify Loki is receiving logs:
   ```bash
   docker-compose logs loki
   ```

3. Check Promtail is collecting logs:
   ```bash
   docker-compose logs promtail
   ```

4. Test Loki API directly:
   ```bash
   curl -G -s "http://localhost:3100/loki/api/v1/labels"
   ```

### Dashboards not showing

1. Check Grafana logs:
   ```bash
   docker-compose logs grafana
   ```

2. Verify dashboard provisioning:
   - Look in `/etc/grafana/provisioning/dashboards/`
   - Check `/var/lib/grafana/dashboards/` for JSON files

3. Manually import dashboards:
   - Go to **Dashboards → Import**
   - Upload the JSON file from `loki/dashboards/`

### Query performance issues

1. Reduce time range (e.g., from 24h to 1h)
2. Add more specific filters to queries
3. Use metric queries instead of log queries for aggregations
4. Increase Loki memory limits in docker-compose.yml

## Best Practices

1. **Start with Overview:** Always check the overview dashboard first for system health
2. **Drill Down:** Use dashboard links to navigate from overview to specific analysis
3. **Use Time Range:** Adjust time range based on what you're investigating
4. **Save Custom Views:** Star frequently used dashboards for quick access
5. **Create Snapshots:** For sharing specific issues, create dashboard snapshots
6. **Set Up Alerts:** Configure alerts for critical metrics (error rate, response time)
7. **Regular Review:** Check dashboards daily for trends and anomalies

## Additional Resources

- [LogQL Documentation](https://grafana.com/docs/loki/latest/logql/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [Loki Configuration](https://grafana.com/docs/loki/latest/configuration/)

## Support

For issues specific to these dashboards, check:
- `loki/README.md` - Loki configuration details
- `KIBANA_IMPLEMENTATION.md` - Full logging implementation guide
- `EXAMPLE_API_WITH_LOGGING.md` - How to add logging to APIs
