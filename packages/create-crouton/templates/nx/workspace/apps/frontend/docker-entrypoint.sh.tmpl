#!/bin/sh
set -e

# Generate runtime config for the frontend
cat > /srv/config.json <<EOF
{
  "APP_VERSION": "${APP_VERSION:-unknown}",
  "BUILD_SHA": "${BUILD_SHA:-unknown}",
  "ENVIRONMENT": "${ENVIRONMENT:-unknown}",
  "env": "${NODE_ENV:-PRD}",
  "API_URL": "${API_URL:-/api}"
}
EOF

echo "Generated /srv/config.json with runtime configuration"

# Generate health config for the frontend
cat > /srv/health.json <<EOF
{
  "status": "ok",
  "version": "${APP_VERSION:-unknown}",
  "buildSha": "${BUILD_SHA:-unknown}",
  "env": "${NODE_ENV:-DEV}",
  "environment": "${ENVIRONMENT:-unknown}",
  "service": "frontend"
}
EOF

echo "Generated /srv/health.json with runtime configuration"

# Execute the main command if provided
if [ $# -gt 0 ]; then
    exec "$@"
fi