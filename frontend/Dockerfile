FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY src /usr/share/nginx/html
COPY docker-entrypoint.d/40-env-config.sh /docker-entrypoint.d/40-env-config.sh

RUN chmod +x /docker-entrypoint.d/40-env-config.sh

EXPOSE 3000
