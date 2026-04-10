#!/bin/bash
# Tear down a PR preview environment
# Usage: ./teardown-pr.sh <PR_NUMBER>
set -e

PR_NUMBER="${1:?Usage: teardown-pr.sh <PR_NUMBER>}"
PROJECT="designpair-pr-${PR_NUMBER}"
DEPLOY_DIR="$HOME/designpair-pr/${PR_NUMBER}"
SNIPPETS_DIR="/etc/nginx/designpair-pr"

echo "Tearing down PR #${PR_NUMBER}..."

# Stop and remove containers
if [ -d "${DEPLOY_DIR}" ]; then
    cd "${DEPLOY_DIR}"
    docker compose -p "${PROJECT}" down --remove-orphans 2>/dev/null || true
    cd ~
    rm -rf "${DEPLOY_DIR}"
fi

# Remove PR-specific images
docker rmi "designpair-frontend:pr-${PR_NUMBER}" 2>/dev/null || true
docker rmi "designpair-backend:pr-${PR_NUMBER}" 2>/dev/null || true

# Remove nginx location snippet
if [ -f "${SNIPPETS_DIR}/pr-${PR_NUMBER}.conf" ]; then
    sudo rm "${SNIPPETS_DIR}/pr-${PR_NUMBER}.conf"
    sudo nginx -t && sudo systemctl reload nginx
fi

echo "PR #${PR_NUMBER} cleaned up"
