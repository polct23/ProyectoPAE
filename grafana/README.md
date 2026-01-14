# Configuración de Grafana para PAE

## Resumen de cambios realizados

### 1. **Dockerfile.grafana**
- ✅ Eliminadas referencias a logos inexistentes (`movere_logo2.svg`)
- ✅ Simplificada la construcción (una sola etapa)
- ✅ Mantenida configuración de custom CSS

### 2. **grafana.ini**
- ✅ Eliminadas referencias a logos inexistentes
- ✅ Configurado `allow_embedding = true` para embed en React
- ✅ Añadida configuración de seguridad para CORS
- ✅ Habilitado acceso anónimo con rol Viewer

### 3. **Datasource (backends.yaml)**
- ✅ Actualizado nombre de datasource a "PAE Backend"
- ✅ URL configurada para apuntar al servicio `backend:8000` en Docker
- ✅ Plugin Infinity datasource configurado

### 4. **Backend (main.py)**
- ✅ Añadidos nuevos endpoints para Grafana:
  - `/grafana/datasets-by-category` - Datasets por categoría
  - `/grafana/datasets-by-format` - Datasets por formato
  - `/grafana/total-datasets` - Total de datasets
  - `/grafana/datasets-coverage` - Cobertura geográfica

### 5. **Dashboard (pae-dashboard.json)**
- ✅ Creado nuevo dashboard con datos reales del proyecto
- ✅ 4 paneles configurados:
  - Stat: Total de datasets
  - Bar chart: Datasets por categoría
  - Pie chart: Datasets por formato
  - Bar gauge: Cobertura geográfica

### 6. **GrafanaEmbed.tsx**
- ✅ Corregida URL de embed
- ✅ Soporte para paneles individuales con `viewPanel`
- ✅ Configuración de tema y modo kiosk

### 7. **docker-compose.yml**
- ✅ Añadido volumen `grafana_data` para persistencia

## Uso del componente GrafanaEmbed

```tsx
import GrafanaEmbed from './components/GrafanaEmbed';

// Dashboard completo
<GrafanaEmbed 
  dashboardId="pae-dashboard" 
  title="Estadísticas de Datasets"
  height="800px"
/>

// Panel específico
<GrafanaEmbed 
  dashboardId="pae-dashboard" 
  panelId={1}
  title="Datasets por Categoría"
  height="400px"
/>
```

## Configuración de variables de entorno

Crea un archivo `.env` en `Demo_RACC/` con:

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_GRAFANA_URL=http://localhost:3000
```

## Iniciar servicios

```bash
# Construir y levantar servicios
docker-compose up --build -d

# Verificar logs
docker-compose logs -f grafana
docker-compose logs -f backend

# Acceder a Grafana directamente
http://localhost:3000
# Usuario: admin / Contraseña: admin

# Dashboard ID para embed
pae-dashboard
```

## Próximos pasos sugeridos

1. **Crear más endpoints** en el backend según tus necesidades de visualización
2. **Personalizar dashboards** con queries más complejas
3. **Agregar filtros** en los dashboards de Grafana
4. **Configurar alertas** en Grafana para datasets obsoletos
5. **Añadir más visualizaciones** (tablas, time series, etc.)

## Estructura de endpoints para Grafana

Los endpoints de Grafana deben retornar datos en formato JSON compatible con Infinity datasource:

```python
# Ejemplo simple
@app.get("/grafana/mi-metrica")
def mi_metrica():
    return [
        {"label": "Etiqueta 1", "value": 10},
        {"label": "Etiqueta 2", "value": 20}
    ]

# Ejemplo con series temporales
@app.get("/grafana/time-series")
def time_series():
    return [
        {"time": "2025-01-09T10:00:00Z", "value": 100},
        {"time": "2025-01-09T11:00:00Z", "value": 150}
    ]
```

## Troubleshooting

### Si Grafana no carga el dashboard:
1. Verifica que el plugin Infinity está instalado: `docker-compose logs grafana | grep infinity`
2. Comprueba la conexión del datasource en Grafana UI
3. Revisa que el backend esté accesible desde Grafana: `docker exec grafana curl http://backend:8000/grafana/total-datasets`

### Si el embed no funciona:
1. Verifica CORS en el navegador
2. Asegúrate que `allow_embedding = true` está en `grafana.ini`
3. Comprueba que la variable de entorno `REACT_APP_GRAFANA_URL` está configurada
