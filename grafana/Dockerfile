# Imagen base de Grafana
FROM grafana/grafana:latest

WORKDIR /app

# Copiar dashboards
COPY dashboards /var/lib/grafana/dashboards

# Copiar archivos de configuración de Grafana
COPY provisioning/datasources /etc/grafana/provisioning/datasources
COPY provisioning/dashboards /etc/grafana/provisioning/dashboards
COPY custom/custom.css /usr/share/grafana/public/css/custom.css
COPY grafana.ini /etc/grafana/grafana.ini  

# Usar el entrypoint por defecto de Grafana
ENTRYPOINT ["/run.sh"]
