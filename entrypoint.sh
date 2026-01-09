#!/bin/sh
set -e  # Hace que el script falle si algún comando da error

echo "🚀 Iniciando generación de dashboards..."
ls -l /app/scripts/

# Ejecutar cada script en la carpeta /app/scripts/
for script in /app/scripts/*.py; do
    echo "▶️ Ejecutando $(basename "$script")..."
    python "$script" || echo "❌ Error en $(basename "$script")"
done

echo "✅ Todos los scripts han finalizado correctamente."
