#!/bin/sh
set -eu

: "${FRONTEND_API_BASE_URL:=http://localhost:8080}"

envsubst '${FRONTEND_API_BASE_URL}' \
  < /usr/share/nginx/html/config.template.js \
  > /usr/share/nginx/html/config.js
