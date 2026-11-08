# Présentation ALCO One pour Coolify : un seul fichier HTML servi par nginx, sans droits root.
# Seule la page est copiée : ni les sources, ni les anciennes versions ne sont exposées.
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY deploy/coolify/nginx.conf /etc/nginx/conf.d/default.conf
COPY v8/index.html /usr/share/nginx/html/index.html
COPY deploy/coolify/public/ /usr/share/nginx/html/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
