#!/bin/bash
# One-time setup: add include directive to designpair.conf for PR preview snippets
# Run this once on the server: ssh lightsail 'bash -s' < docker/setup-pr-nginx.sh
set -e

CONF="/etc/nginx/conf.d/designpair.conf"
SNIPPETS_DIR="/etc/nginx/designpair-pr"

# Create snippets directory
sudo mkdir -p "${SNIPPETS_DIR}"

# Check if include already exists
if grep -q "designpair-pr" "${CONF}"; then
    echo "Include directive already present in ${CONF}"
    exit 0
fi

# Insert include directive inside the HTTPS server block, after the main location block
sudo sed -i '/proxy_read_timeout 86400s;/{n;s/}/\n    # PR preview deployments\n    include \/etc\/nginx\/designpair-pr\/*.conf;\n}/}' "${CONF}"

sudo nginx -t && sudo systemctl reload nginx
echo "PR preview nginx setup complete"
