#!/bin/bash
# Deploy a PR preview environment
# Usage: ./deploy-pr.sh <PR_NUMBER>
set -e

PR_NUMBER="${1:?Usage: deploy-pr.sh <PR_NUMBER>}"
PR_PORT=$((9000 + PR_NUMBER))
PROJECT="designpair-pr-${PR_NUMBER}"
DEPLOY_DIR="$HOME/designpair-pr/${PR_NUMBER}"
SNIPPETS_DIR="/etc/nginx/designpair-pr"

echo "Deploying PR #${PR_NUMBER} on port ${PR_PORT}..."

# Create deployment directory
mkdir -p "${DEPLOY_DIR}"

# Copy compose file and .env
cp "$HOME/designpair/.env" "${DEPLOY_DIR}/.env" 2>/dev/null || true
cp /tmp/docker-compose.pr.yml "${DEPLOY_DIR}/docker-compose.yml"

# Start containers
cd "${DEPLOY_DIR}"
PR_NUMBER="${PR_NUMBER}" PR_PORT="${PR_PORT}" docker compose -p "${PROJECT}" up -d --force-recreate

# Create snippets directory if needed
sudo mkdir -p "${SNIPPETS_DIR}"

# Add nginx location snippet for this PR
sudo tee "${SNIPPETS_DIR}/pr-${PR_NUMBER}.conf" > /dev/null << NGINX
# PR #${PR_NUMBER} preview — auto-generated, do not edit
location /pr/${PR_NUMBER}/ {
    proxy_pass http://127.0.0.1:${PR_PORT}/pr/${PR_NUMBER}/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 86400s;
}
NGINX

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx

# Wait for health check
echo "Waiting for health check..."
for i in $(seq 1 30); do
    if curl -sf "http://localhost:${PR_PORT}/pr/${PR_NUMBER}/health" > /dev/null 2>&1; then
        echo "PR #${PR_NUMBER} deployed at https://designpair.colberts.us/pr/${PR_NUMBER}/"
        exit 0
    fi
    sleep 2
done
echo "WARNING: Health check did not pass within 60 seconds"
docker compose -p "${PROJECT}" logs --tail 20
exit 1
