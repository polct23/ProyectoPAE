# Funcionalidad RAG (Retrieval Augmented Generation)

## Descripción

Se ha añadido una funcionalidad completa de RAG al proyecto PAE RACC, que permite:

- Subir documentos PDF a una base de datos vectorial (Weaviate)
- Hacer preguntas al sistema que responde únicamente basándose en los documentos cargados
- Detección automática de idioma y traducción de respuestas
- Historial de conversación con contexto

## Tecnologías Utilizadas

- **Backend**: FastAPI (Python)
- **Base de Datos Vectorial**: Weaviate
- **LLM**: OpenAI GPT-4o-mini
- **Embeddings**: OpenAI text-embedding-ada-002
- **Frontend**: React + TypeScript

## Configuración

### 1. Instalar Dependencias de Python

```bash
cd Backend
pip install -r requirements.txt
```

Las nuevas dependencias añadidas son:
- `openai` - Cliente de OpenAI
- `weaviate-client` - Cliente de Weaviate
- `pypdf` - Para procesar PDFs
- `opik` - Para tracking de LLM

### 2. Configurar Variables de Entorno

Copia el archivo `.env.example` a `.env` y configura las siguientes variables:

```bash
cp .env.example .env
```

Edita el archivo `.env`:

```env
# OpenAI (OBLIGATORIO)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Weaviate
WEAVIATE_URL=http://localhost:8080
WEAVIATE_API_KEY=  # Opcional si usas Weaviate local
```

### 3. Instalar y Ejecutar Weaviate

Hay dos opciones:

#### Opción A: Weaviate con Docker (Recomendado)

```bash
docker run -d \
  --name weaviate \
  -p 8080:8080 \
  -e AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true \
  -e PERSISTENCE_DATA_PATH=/var/lib/weaviate \
  -e DEFAULT_VECTORIZER_MODULE=text2vec-openai \
  -e ENABLE_MODULES=text2vec-openai \
  -e CLUSTER_HOSTNAME=node1 \
  semitechnologies/weaviate:latest
```

#### Opción B: Weaviate Cloud (WCS)

1. Crea una cuenta gratuita en [Weaviate Cloud](https://console.weaviate.cloud/)
2. Crea un cluster
3. Obtén la URL y API key
4. Configura en `.env`:
   ```env
   WEAVIATE_URL=https://your-cluster.weaviate.network
   WEAVIATE_API_KEY=your-api-key
   ```

### 4. Obtener API Key de OpenAI

1. Ve a [OpenAI Platform](https://platform.openai.com/)
2. Crea una cuenta o inicia sesión
3. Ve a [API Keys](https://platform.openai.com/api-keys)
4. Crea una nueva API key
5. Copia la key a tu archivo `.env`

**Nota**: Necesitarás saldo en tu cuenta de OpenAI. Los primeros $5 son gratuitos para nuevos usuarios.

## Uso

### Iniciar el Backend

```bash
cd Backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Iniciar el Frontend

```bash
cd Demo_RACC
npm start
```

### Usar el Chatbot

1. Abre la aplicación en `http://localhost:3000`
2. Navega a la sección **"🤖 Assistent Virtual"** en el menú lateral
3. **Para cargar documentos** (requiere autenticación):
   - Haz login con las credenciales de admin
   - Selecciona un archivo PDF
   - Haz clic en "Subir PDF"
   - Espera la confirmación
4. **Para hacer preguntas**:
   - Escribe tu pregunta en el chat
   - El sistema buscará en los documentos cargados
   - Recibirás una respuesta con referencias a las fuentes

## Endpoints de la API

### POST /rag/upload
Sube un PDF para procesarlo e indexarlo en Weaviate.

**Requiere**: Autenticación (Bearer token)

**Request**:
```
Content-Type: multipart/form-data
Authorization: Bearer <access_token>

file: <archivo.pdf>
```

**Response**:
```json
{
  "message": "42 fragmentos cargados exitosamente",
  "filename": "documento.pdf"
}
```

### POST /rag/ask
Hace una pregunta al sistema RAG.

**Request**:
```json
{
  "question": "¿Cuáles son las principales causas de accidentes?",
  "language": "es"  // opcional
}
```

**Response**:
```json
{
  "question": "¿Cuáles son las principales causas de accidentes?",
  "answer": "Según los documentos, las principales causas son...\n\n(Fuente: \"informe_2024.pdf\", Página: 15)"
}
```

### POST /rag/clear-history
Limpia el historial de conversación.

**Requiere**: Autenticación (Bearer token)

**Response**:
```json
{
  "message": "Historial limpiado exitosamente"
}
```

## Arquitectura

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │
       │ Pregunta
       ▼
┌─────────────────┐
│    Frontend     │
│   (React)       │
└──────┬──────────┘
       │
       │ HTTP Request
       ▼
┌─────────────────┐
│    Backend      │
│   (FastAPI)     │
└──────┬──────────┘
       │
       ├──────────┐
       │          │
       ▼          ▼
┌──────────┐ ┌──────────┐
│ Weaviate │ │  OpenAI  │
│  (Vector │ │   (LLM)  │
│   DB)    │ │          │
└──────────┘ └──────────┘
```

## Flujo de Procesamiento

### 1. Carga de Documentos
```
PDF → Extracción de texto → División en chunks →
→ Generación de embeddings (OpenAI) → Almacenamiento en Weaviate
```

### 2. Consulta (RAG)
```
Pregunta usuario → Detección de idioma →
→ Búsqueda vectorial en Weaviate → Recuperación de contextos relevantes →
→ Generación de respuesta (GPT-4o-mini) → Traducción si es necesario →
→ Respuesta al usuario
```

## Características Avanzadas

- **Multiidioma**: Detecta automáticamente el idioma de la pregunta y responde en el mismo
- **Referencias**: Las respuestas incluyen citas con nombre de archivo y número de página
- **Historial contextual**: Mantiene los últimos 5 intercambios para respuestas más coherentes
- **Chunking inteligente**: Los documentos se dividen con solapamiento para mantener contexto
- **Solo información de la BD**: El sistema está configurado para responder ÚNICAMENTE basándose en los documentos cargados

## Limitaciones

- Solo soporta archivos PDF
- Requiere conexión a internet para OpenAI
- Costos asociados al uso de la API de OpenAI
- Los documentos grandes pueden tardar en procesarse

## Troubleshooting

### Error: "Weaviate no está disponible"
- Verifica que Weaviate esté ejecutándose en el puerto 8080
- Comprueba la configuración de `WEAVIATE_URL` en `.env`

### Error: "Invalid API key"
- Verifica tu `OPENAI_API_KEY` en `.env`
- Asegúrate de tener saldo en tu cuenta de OpenAI

### Error al subir PDF
- Verifica que el archivo sea un PDF válido
- Asegúrate de estar autenticado
- Comprueba los logs del backend para más detalles

### No encuentra información en los documentos
- Verifica que se hayan cargado documentos correctamente
- Intenta reformular la pregunta
- Revisa que el contenido del PDF sea relevante para la pregunta

## Costos Estimados (OpenAI)

Basado en el uso de GPT-4o-mini y text-embedding-ada-002:

- **Embeddings**: ~$0.10 por cada 1M tokens (aprox. 1000 páginas)
- **Consultas**: ~$0.15 por cada 1M tokens de entrada, ~$0.60 por cada 1M tokens de salida
- **Costo típico por pregunta**: $0.001 - $0.01

## Próximas Mejoras

- [ ] Soporte para más formatos (Word, Excel, etc.)
- [ ] Interfaz para gestionar documentos cargados
- [ ] Exportación de conversaciones
- [ ] Métricas de uso y calidad de respuestas
- [ ] Caché de respuestas frecuentes
- [ ] Integración con más LLMs (Anthropic, Llama, etc.)

## Contacto y Soporte

Para preguntas o problemas, contacta con el equipo de desarrollo.
