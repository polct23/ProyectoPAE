import json
import weaviate
from weaviate.classes.init import Auth
from weaviate.classes.config import Configure, Property, DataType
from weaviate.classes.query import MetadataQuery
import os
from pypdf import PdfReader
from openai import OpenAI
from opik.integrations.openai import track_openai
from opik import track
import logging
import csv
import xml.etree.ElementTree as ET

# Configuración del logger
logger = logging.getLogger(__name__)

# Variables de entorno
OPENAI_APIKEY = os.getenv("OPENAI_API_KEY")
WEAVIATE_URL = os.getenv("WEAVIATE_URL", "http://localhost:8080")
WEAVIATE_API_KEY = os.getenv("WEAVIATE_API_KEY", "")

# Cliente OpenAI
clientOpenAi = OpenAI(api_key=OPENAI_APIKEY)
client = track_openai(openai_client=clientOpenAi, project_name="PAE RACC Chatbot")

# Historial de conversación
historial_conversacion = []


def cargar_texto_desde_pdf(pdf_path: str) -> list:
    """
    Carga texto desde un archivo PDF y lo divide en fragmentos.
    """
    try:
        logger.info(f"Inicio de carga del PDF: {pdf_path}")
        with open(pdf_path, 'rb') as file:
            pdf = PdfReader(file)
            documents = []
            filename = os.path.basename(pdf_path)
            
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text.strip():
                    # Añadir contexto descriptivo al inicio del texto
                    texto_con_contexto = f"=== Documento PDF: {filename} ===\nPágina {page_num + 1} de {len(pdf.pages)}\nTipo: Documento PDF\n\n{text}"
                    
                    chunks = dividir_texto(texto_con_contexto, chunk_size=2000, overlap=200)
                    for chunk in chunks:
                        documents.append({
                            "content": chunk,
                            "metadata": json.dumps({
                                "page": page_num + 1,
                                "filename": filename,
                                "type": "pdf",
                                "total_pages": len(pdf.pages)
                            })
                        })
        logger.info(f"Finalización de la carga del PDF: {pdf_path} - {len(documents)} fragmentos creados")
        return documents
    except Exception as e:
        logger.error(f"Error al cargar el PDF: {e}")
        return []


def dividir_texto(text: str, chunk_size: int = 2000, overlap: int = 200) -> list:
    """
    Divide texto en fragmentos más pequeños con solapamiento.
    """
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


def cargar_texto_desde_xml(xml_path: str) -> list:
    """
    Carga texto desde un archivo XML y lo divide en fragmentos.
    """
    try:
        logger.info(f"Inicio de carga del XML: {xml_path}")
        tree = ET.parse(xml_path)
        root = tree.getroot()
        
        documents = []
        
        # Función recursiva para extraer texto de todos los elementos
        def extraer_texto_recursivo(elemento, ruta=""):
            texto_elemento = []
            
            # Añadir tag y atributos
            if elemento.tag:
                info_tag = f"{ruta}/{elemento.tag}"
                if elemento.attrib:
                    info_tag += f" (atributos: {', '.join([f'{k}={v}' for k, v in elemento.attrib.items()])})"
                texto_elemento.append(info_tag)
            
            # Añadir texto del elemento
            if elemento.text and elemento.text.strip():
                texto_elemento.append(f"Contenido: {elemento.text.strip()}")
            
            # Procesar hijos
            for hijo in elemento:
                texto_elemento.extend(extraer_texto_recursivo(hijo, info_tag))
            
            return texto_elemento
        
        # Extraer todo el texto
        texto_elementos = extraer_texto_recursivo(root)
        
        # Añadir encabezado descriptivo
        filename = os.path.basename(xml_path)
        encabezado = [
            f"=== Documento XML: {filename} ===",
            f"Tipo: Archivo XML estructurado",
            f"Elemento raíz: {root.tag}",
            f"Total de elementos: {len(texto_elementos)}",
            ""
        ]
        
        texto_completo = "\n".join(encabezado + texto_elementos)
        
        # Dividir en chunks más grandes para XML
        chunks = dividir_texto(texto_completo, chunk_size=2500, overlap=250)
        for idx, chunk in enumerate(chunks):
            documents.append({
                "content": chunk,
                "metadata": json.dumps({
                    "chunk": idx + 1,
                    "filename": filename,
                    "type": "xml",
                    "root_element": root.tag
                })
            })
        
        logger.info(f"Finalización de la carga del XML: {xml_path} - {len(documents)} fragmentos creados")
        return documents
    except Exception as e:
        logger.error(f"Error al cargar el XML: {e}")
        return []


def cargar_texto_desde_json(json_path: str) -> list:
    """
    Carga texto desde un archivo JSON y lo divide en fragmentos.
    """
    try:
        logger.info(f"Inicio de carga del JSON: {json_path}")
        with open(json_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        documents = []
        
        # Convertir JSON a texto legible
        def json_a_texto(obj, nivel=0, ruta="root"):
            lineas = []
            indent = "  " * nivel
            
            if isinstance(obj, dict):
                for key, value in obj.items():
                    nueva_ruta = f"{ruta}.{key}"
                    if isinstance(value, (dict, list)):
                        lineas.append(f"{indent}{key}:")
                        lineas.extend(json_a_texto(value, nivel + 1, nueva_ruta))
                    else:
                        lineas.append(f"{indent}{key}: {value}")
            elif isinstance(obj, list):
                for idx, item in enumerate(obj):
                    nueva_ruta = f"{ruta}[{idx}]"
                    if isinstance(item, (dict, list)):
                        lineas.append(f"{indent}Elemento {idx + 1}:")
                        lineas.extend(json_a_texto(item, nivel + 1, nueva_ruta))
                    else:
                        lineas.append(f"{indent}- {item}")
            else:
                lineas.append(f"{indent}{obj}")
            
            return lineas
        
        # Preparar texto con contexto descriptivo
        filename = os.path.basename(json_path)
        encabezado = [
            f"=== Documento JSON: {filename} ===",
            f"Tipo: Archivo JSON estructurado",
            f"Estructura: {type(data).__name__}",
            ""
        ]
        
        texto_datos = json_a_texto(data)
        texto_completo = "\n".join(encabezado + texto_datos)
        
        # Dividir en chunks más grandes para JSON
        chunks = dividir_texto(texto_completo, chunk_size=2500, overlap=250)
        for idx, chunk in enumerate(chunks):
            documents.append({
                "content": chunk,
                "metadata": json.dumps({
                    "chunk": idx + 1,
                    "filename": filename,
                    "type": "json",
                    "data_type": type(data).__name__
                })
            })
        
        logger.info(f"Finalización de la carga del JSON: {json_path} - {len(documents)} fragmentos creados")
        return documents
    except Exception as e:
        logger.error(f"Error al cargar el JSON: {e}")
        return []


def cargar_texto_desde_csv(csv_path: str) -> list:
    """
    Carga texto desde un archivo CSV y lo divide en fragmentos.
    """
    try:
        logger.info(f"Inicio de carga del CSV: {csv_path}")
        documents = []
        
        # Detectar el delimitador
        with open(csv_path, 'r', encoding='utf-8') as file:
            sample = file.read(1024)
            file.seek(0)
            
            # Detectar si usa ; o ,
            delimiter = ';' if sample.count(';') > sample.count(',') else ','
            
            csv_reader = csv.DictReader(file, delimiter=delimiter)
            rows = list(csv_reader)
            
            if not rows:
                logger.warning(f"El CSV está vacío: {csv_path}")
                return []
            
            # Convertir CSV a texto optimizado para búsqueda semántica
            filename = os.path.basename(csv_path)
            lineas = []
            lineas.append(f"=== Dataset CSV: {filename} ===")
            lineas.append(f"Tipo: Datos tabulares CSV estructurados")
            lineas.append(f"Total de registros: {len(rows)} filas de datos")
            lineas.append(f"Columnas disponibles: {', '.join(rows[0].keys())}")
            lineas.append(f"Palabras clave: datos, estadísticas, registros, información, cifras, números")
            lineas.append("")
            lineas.append("--- DATOS DEL CSV ---")
            lineas.append("")
            
            # Procesar cada fila de manera más descriptiva
            for idx, row in enumerate(rows, 1):
                # Crear descripción natural de cada registro
                descripcion_parts = []
                for key, value in row.items():
                    if value and value.strip():  # Solo incluir valores no vacíos
                        # Limpiar comillas del CSV
                        clean_key = key.strip('"')
                        clean_value = value.strip('"')
                        descripcion_parts.append(f"{clean_key}: {clean_value}")
                
                if descripcion_parts:
                    lineas.append(f"Registro {idx}: {' | '.join(descripcion_parts)}")
            
            texto_completo = "\n".join(lineas)
            
            # Dividir en chunks más grandes para mantener contexto
            chunks = dividir_texto(texto_completo, chunk_size=3000, overlap=300)
            for idx, chunk in enumerate(chunks):
                documents.append({
                    "content": chunk,
                    "metadata": json.dumps({
                        "chunk": idx + 1,
                        "filename": os.path.basename(csv_path),
                        "type": "csv",
                        "total_rows": len(rows),
                        "columns": list(rows[0].keys())
                    })
                })
        
        logger.info(f"Finalización de la carga del CSV: {csv_path} - {len(documents)} fragmentos creados")
        return documents
    except Exception as e:
        logger.error(f"Error al cargar el CSV: {e}")
        return []


def cargar_documento(file_path: str) -> list:
    """
    Detecta el tipo de archivo y carga su contenido.
    Soporta: PDF, XML, JSON, CSV
    """
    extension = os.path.splitext(file_path)[1].lower()
    
    if extension == '.pdf':
        return cargar_texto_desde_pdf(file_path)
    elif extension == '.xml':
        return cargar_texto_desde_xml(file_path)
    elif extension == '.json':
        return cargar_texto_desde_json(file_path)
    elif extension == '.csv':
        return cargar_texto_desde_csv(file_path)
    else:
        logger.error(f"Formato de archivo no soportado: {extension}")
        return []


def initialize_weaviate(file_path: str) -> dict:
    """
    Inicializa Weaviate y almacena embeddings del documento usando API v4.
    Soporta: PDF, XML, JSON, CSV
    """
    logger.info("Inicializando conexión con Weaviate.")
    logger.info(f"WEAVIATE_URL: {WEAVIATE_URL}")
    logger.info(f"WEAVIATE_API_KEY presente: {bool(WEAVIATE_API_KEY)}")
    
    # Cargar documento según su tipo
    documentos = cargar_documento(file_path)

    if not documentos:
        return {"success": False, "message": "No se pudieron cargar documentos del archivo"}

    logger.info("Conectando al cliente Weaviate v4.")
    
    try:
        # Configurar cliente v4 según si es Cloud o Local
        is_cloud = WEAVIATE_API_KEY and ("weaviate.network" in WEAVIATE_URL or "weaviate.cloud" in WEAVIATE_URL or "wcs" in WEAVIATE_URL)
        logger.info(f"Detectado como Weaviate {'Cloud' if is_cloud else 'Local'}")
        
        if is_cloud:
            # Weaviate Cloud
            logger.info(f"Conectando a Weaviate Cloud: {WEAVIATE_URL}")
            weaviate_client = weaviate.connect_to_weaviate_cloud(
                cluster_url=WEAVIATE_URL,
                auth_credentials=Auth.api_key(WEAVIATE_API_KEY),
                headers={
                    "X-OpenAI-Api-Key": OPENAI_APIKEY
                }
            )
        else:
            # Weaviate Local
            logger.info(f"Conectando a Weaviate Local: {WEAVIATE_URL}")
            # Parsear host y puerto de la URL
            url_clean = WEAVIATE_URL.replace("http://", "").replace("https://", "")
            if ":" in url_clean:
                host, port_str = url_clean.split(":")
                port = int(port_str.split("/")[0])  # En caso de tener path después
            else:
                host = url_clean.split("/")[0]
                port = 8080
            
            weaviate_client = weaviate.connect_to_local(
                host=host,
                port=port,
                headers={
                    "X-OpenAI-Api-Key": OPENAI_APIKEY
                }
            )

        # Verificar si Weaviate está listo
        if not weaviate_client.is_ready():
            logger.error("Weaviate no está disponible.")
            weaviate_client.close()
            return {"success": False, "message": "Weaviate no está disponible"}
        
        logger.info("Weaviate está listo para recibir datos.")

        # Crear la colección RagPAE si no existe
        try:
            if not weaviate_client.collections.exists("RagPAE"):
                weaviate_client.collections.create(
                    name="RagPAE",
                    vectorizer_config=Configure.Vectorizer.text2vec_openai(
                        model="text-embedding-3-small"
                    ),
                    properties=[
                        Property(name="content", data_type=DataType.TEXT),
                        Property(name="metadata", data_type=DataType.TEXT)
                    ]
                )
                logger.info("Colección RagPAE creada exitosamente.")
            else:
                logger.info("La colección RagPAE ya existe.")
        except Exception as e:
            logger.error(f"Error al crear o verificar la colección: {e}")
            weaviate_client.close()
            return {"success": False, "message": f"Error al crear colección: {str(e)}"}

        # Subir documentos a la colección
        logger.info("Iniciando la carga de documentos al esquema RagPAE.")
        try:
            collection = weaviate_client.collections.get("RagPAE")
            with collection.batch.dynamic() as batch:
                for doc in documentos:
                    batch.add_object(
                        properties={
                            "content": doc["content"],
                            "metadata": doc["metadata"]
                        }
                    )
            logger.info("Finalización de la carga de documentos.")
            weaviate_client.close()
            return {"success": True, "message": f"{len(documentos)} fragmentos cargados exitosamente"}
        except Exception as e:
            logger.error(f"Error al cargar documentos: {e}")
            weaviate_client.close()
            return {"success": False, "message": f"Error al cargar documentos: {str(e)}"}
    except Exception as e:
        logger.error(f"Error al conectar con Weaviate: {e}")
        return {"success": False, "message": f"Error de conexión: {str(e)}"}


@track(project_name="PAE RACC Chatbot")
def buscar_en_weaviate(pregunta: str, k: int = 5, file_type_filter: str = None) -> list:
    """
    Realiza búsqueda vectorial en Weaviate usando API v4.
    
    Args:
        pregunta: Texto de búsqueda
        k: Número de resultados a devolver
        file_type_filter: Filtro opcional por tipo de archivo ('pdf', 'csv', 'xml', 'json', None para todos)
    """
    logger.info("Iniciando búsqueda en Weaviate.")
    if file_type_filter:
        logger.info(f"Aplicando filtro de tipo: {file_type_filter}")
    
    try:
        # Configurar cliente v4 según si es Cloud o Local
        is_cloud = WEAVIATE_API_KEY and ("weaviate.network" in WEAVIATE_URL or "weaviate.cloud" in WEAVIATE_URL or "wcs" in WEAVIATE_URL)
        logger.info(f"Detectado como Weaviate {'Cloud' if is_cloud else 'Local'}")
        
        if is_cloud:
            # Weaviate Cloud
            logger.info(f"Conectando a Weaviate Cloud: {WEAVIATE_URL}")
            weaviate_client = weaviate.connect_to_weaviate_cloud(
                cluster_url=WEAVIATE_URL,
                auth_credentials=Auth.api_key(WEAVIATE_API_KEY),
                headers={
                    "X-OpenAI-Api-Key": OPENAI_APIKEY
                }
            )
        else:
            # Weaviate Local
            # Parsear host y puerto de la URL
            url_clean = WEAVIATE_URL.replace("http://", "").replace("https://", "")
            if ":" in url_clean:
                host, port_str = url_clean.split(":")
                port = int(port_str.split("/")[0])  # En caso de tener path después
            else:
                host = url_clean.split("/")[0]
                port = 8080
            
            weaviate_client = weaviate.connect_to_local(
                host=host,
                port=port,
                headers={
                    "X-OpenAI-Api-Key": OPENAI_APIKEY
                }
            )

        logger.info(f"Realizando consulta en Weaviate con la pregunta: '{pregunta}' y límite de {k} resultados.")

        try:
            collection = weaviate_client.collections.get("RagPAE")
            
            # Aplicar filtro si se especifica
            if file_type_filter:
                from weaviate.classes.query import Filter
                logger.info(f"Aplicando filtro: buscando archivos de tipo '{file_type_filter}'")
                
                # Buscar por el campo 'type' O por la extensión del archivo
                # Esto permite compatibilidad con documentos antiguos y nuevos
                filter_patterns = [
                    f'"type": "{file_type_filter}"',  # Documentos nuevos con campo type
                    f'.{file_type_filter}"'  # Documentos antiguos: busca .pdf" .csv" etc en el filename
                ]
                
                response = collection.query.near_text(
                    query=pregunta,
                    limit=k,
                    return_metadata=MetadataQuery(distance=True),
                    filters=Filter.by_property("metadata").contains_any(filter_patterns)
                )
                logger.info(f"Consulta con filtro completada. Resultados encontrados: {len(response.objects)}")
            else:
                response = collection.query.near_text(
                    query=pregunta,
                    limit=k,
                    return_metadata=MetadataQuery(distance=True)
                )
        except Exception as e:
            logger.error(f"Error al realizar la búsqueda en Weaviate: {e}")
            weaviate_client.close()
            raise ValueError(f"Error al realizar la búsqueda en Weaviate: {e}")

        # Procesar resultados
        logger.info("Procesando resultados de la consulta.")
        if not response.objects:
            logger.warning(f"No se encontraron resultados en Weaviate{' con filtro ' + file_type_filter if file_type_filter else ''}.")
            weaviate_client.close()
            return []

        contextos = []
        for obj in response.objects:
            metadata = json.loads(obj.properties["metadata"]) if "metadata" in obj.properties else {}
            contextos.append({
                "content": obj.properties["content"],
                "filename": metadata.get("filename", "desconocido"),
                "page": metadata.get("page", "desconocida"),
                "type": metadata.get("type", "desconocido")
            })

        logger.info(f"Consulta finalizada. Se encontraron {len(contextos)} contextos.")
        # Log de tipos de archivos encontrados
        tipos_encontrados = [ctx.get('type', 'unknown') for ctx in contextos]
        logger.info(f"Tipos de archivo en resultados: {tipos_encontrados}")
        weaviate_client.close()
        return contextos
    except Exception as e:
        logger.error(f"Error de conexión con Weaviate: {e}")
        raise ValueError(f"Error de conexión con Weaviate: {e}")


def generar_respuesta_llm(pregunta: str, contextos: list) -> str:
    """
    Genera respuesta usando GPT con el contexto recuperado.
    """
    try:
        # Log de debug: mostrar de qué archivos vienen los contextos
        archivos_contexto = [ctx['filename'] for ctx in contextos]
        logger.info(f"Contextos obtenidos de archivos: {archivos_contexto}")
        
        # Construir el contexto combinado con formato adaptado al tipo
        partes_contexto = []
        for i, ctx in enumerate(contextos):
            fuente = f"Fuente: {ctx['filename']}"
            if ctx.get('page') and ctx['page'] != 'desconocida':
                fuente += f", Página: {ctx['page']}"
            partes_contexto.append(f"Fragmento {i+1} ({fuente}):\n{ctx['content']}")
        
        contexto_combinado = "\n\n---\n\n".join(partes_contexto)

        # Construir mensajes para el LLM
        system_prompt = """Eres un asistente especializado en análisis de tráfico y seguridad vial para el proyecto PAE RACC.
Tu tarea es responder preguntas basándote ÚNICAMENTE en el contexto proporcionado, que puede incluir datos estructurados de CSV, JSON, XML o texto de PDF.

INSTRUCCIONES IMPORTANTES:
1. Solo usa información del contexto proporcionado
2. Cuando el contexto contiene datos estructurados (CSV/JSON), interpreta y presenta los datos de manera clara
3. Para datos numéricos, proporciona cifras exactas y realiza cálculos si es necesario
4. Si encuentras registros relevantes en el contexto, resume los datos clave
5. Si no encuentras la respuesta en el contexto, di claramente: "No tengo información suficiente en la base de datos para responder esa pregunta"
6. Cita las fuentes al final de tu respuesta en el formato: (Fuente: "nombre_archivo")
7. Sé claro, conciso y profesional
8. Para preguntas sobre ubicaciones geográficas (como comarcas, ciudades), busca coincidencias exactas o similares en los datos

EJEMPLO DE RESPUESTA PARA DATOS CSV:
Si preguntan "¿Cuántos accidentes mortales en Alt Empordà?"
Y el contexto contiene: "Alt Empordà | Accidents / Mortals: 14"
Responde: "Según los datos, en Alt Empordà se registraron 14 accidentes mortales. (Fuente: nombre_archivo.csv)" """

        user_prompt = f"""Pregunta: {pregunta}

Contexto disponible:
{contexto_combinado}

Por favor, responde la pregunta basándote únicamente en el contexto proporcionado."""

        # Añadir al historial
        historial_conversacion.append({"role": "user", "content": pregunta})

        # Construir mensajes con historial limitado (últimos 5 intercambios)
        mensajes = [{"role": "system", "content": system_prompt}]
        mensajes.extend(historial_conversacion[-10:])  # Últimos 5 intercambios (10 mensajes)
        mensajes.append({"role": "user", "content": user_prompt})

        # Llamar a OpenAI
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=mensajes,
            temperature=0.3,
            max_tokens=1500
        )

        respuesta = response.choices[0].message.content
        historial_conversacion.append({"role": "assistant", "content": respuesta})

        logger.info("Respuesta generada exitosamente.")
        return respuesta

    except Exception as e:
        logger.error(f"Error al generar respuesta: {e}")
        return f"Error al generar respuesta: {str(e)}"


def detectar_idioma_llm(pregunta: str) -> str:
    """
    Detecta el idioma de la pregunta utilizando OpenAI.
    """
    try:
        response = clientOpenAi.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Detecta el idioma del siguiente texto y responde únicamente con el código ISO 639-1 (por ejemplo: 'es', 'en', 'ca', 'fr'). Solo responde con el código, sin explicaciones."},
                {"role": "user", "content": pregunta}
            ],
            temperature=0,
            max_tokens=10
        )
        idioma = response.choices[0].message.content.strip().lower()
        logger.info(f"Idioma detectado: {idioma}")
        return idioma
    except Exception as e:
        logger.error(f"Error al detectar idioma: {e}")
        return "es"  # Por defecto español


def traducir_pregunta(pregunta: str, idioma_destino: str = "es") -> str:
    """
    Traduce una pregunta al idioma especificado.
    """
    try:
        response = clientOpenAi.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"Traduce el siguiente texto al idioma con código '{idioma_destino}'. Responde ÚNICAMENTE con la traducción, sin añadir explicaciones ni comentarios."},
                {"role": "user", "content": pregunta}
            ],
            temperature=0.3,
            max_tokens=500
        )
        texto_traducido = response.choices[0].message.content.strip()
        logger.info(f"Pregunta traducida a {idioma_destino}")
        return texto_traducido
    except Exception as e:
        logger.error(f"Error al traducir pregunta: {e}")
        return pregunta


def traducir_respuesta(respuesta: str, idioma_destino: str) -> str:
    """
    Traduce una respuesta al idioma especificado.
    """
    try:
        response = clientOpenAi.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"Traduce el siguiente texto al idioma con código '{idioma_destino}'. Responde ÚNICAMENTE con la traducción, sin añadir explicaciones ni comentarios. Mantén el formato y las referencias de fuentes."},
                {"role": "user", "content": respuesta}
            ],
            temperature=0.3,
            max_tokens=2000
        )
        texto_traducido = response.choices[0].message.content.strip()
        logger.info(f"Respuesta traducida a {idioma_destino}")
        return texto_traducido
    except Exception as e:
        logger.error(f"Error al traducir respuesta: {e}")
        return respuesta


@track(project_name="PAE RACC Chatbot")
def obtener_respuesta_rag(pregunta: str, idioma_usuario: str = None, file_type_filter: str = None) -> str:
    """
    Función principal RAG que procesa la pregunta y genera respuesta.
    
    Args:
        pregunta: Pregunta del usuario
        idioma_usuario: Código de idioma (opcional)
        file_type_filter: Filtro por tipo de archivo ('pdf', 'csv', 'xml', 'json', None)
    """
    try:
        # Detectar idioma si no se proporciona
        if not idioma_usuario:
            idioma_usuario = detectar_idioma_llm(pregunta)
        
        logger.info(f"Procesando pregunta en idioma: {idioma_usuario}")
        if file_type_filter:
            logger.info(f"Filtrando búsqueda por tipo: {file_type_filter}")

        # Traducir pregunta a español si es necesario
        pregunta_es = pregunta
        if idioma_usuario != "es":
            pregunta_es = traducir_pregunta(pregunta, "es")
            logger.info(f"Pregunta traducida al español: {pregunta_es}")

        # Buscar contexto relevante (k=10 para mayor cobertura)
        contextos = buscar_en_weaviate(pregunta_es, k=10, file_type_filter=file_type_filter)

        if not contextos:
            respuesta = "No encontré información relevante en la base de datos para responder tu pregunta."
        else:
            # Generar respuesta
            respuesta = generar_respuesta_llm(pregunta_es, contextos)

        # Traducir respuesta al idioma original si es necesario
        if idioma_usuario != "es":
            respuesta = traducir_respuesta(respuesta, idioma_usuario)

        logger.info("Respuesta RAG completada exitosamente.")
        return respuesta

    except Exception as e:
        logger.error(f"Error en obtener_respuesta_rag: {e}")
        return "Ocurrió un error al procesar la pregunta. Por favor, intenta de nuevo."


def limpiar_historial():
    """
    Limpia el historial de conversación.
    """
    global historial_conversacion
    historial_conversacion = []
    logger.info("Historial de conversación limpiado.")

def obtener_archivos_disponibles() -> list:
    """
    Obtiene la lista de archivos únicos almacenados en Weaviate.
    """
    try:
        logger.info("Obteniendo lista de archivos disponibles.")
        
        # Configurar cliente
        is_cloud = WEAVIATE_API_KEY and ("weaviate.network" in WEAVIATE_URL or "weaviate.cloud" in WEAVIATE_URL or "wcs" in WEAVIATE_URL)
        
        if is_cloud:
            weaviate_client = weaviate.connect_to_weaviate_cloud(
                cluster_url=WEAVIATE_URL,
                auth_credentials=Auth.api_key(WEAVIATE_API_KEY),
                headers={"X-OpenAI-Api-Key": OPENAI_APIKEY}
            )
        else:
            url_clean = WEAVIATE_URL.replace("http://", "").replace("https://", "")
            if ":" in url_clean:
                host, port_str = url_clean.split(":")
                port = int(port_str.split("/")[0])
            else:
                host = url_clean.split("/")[0]
                port = 8080
            
            weaviate_client = weaviate.connect_to_local(
                host=host,
                port=port,
                headers={"X-OpenAI-Api-Key": OPENAI_APIKEY}
            )
        
        if not weaviate_client.collections.exists("RagPAE"):
            weaviate_client.close()
            return []
        
        collection = weaviate_client.collections.get("RagPAE")
        
        # Obtener todos los documentos
        response = collection.query.fetch_objects(limit=1000)
        
        # Extraer nombres de archivos únicos
        archivos = set()
        for obj in response.objects:
            metadata = json.loads(obj.properties["metadata"])
            filename = metadata.get("filename", "desconocido")
            file_type = metadata.get("type", "unknown")
            archivos.add(f"{filename} ({file_type})")
        
        weaviate_client.close()
        
        archivos_lista = sorted(list(archivos))
        logger.info(f"Archivos encontrados: {archivos_lista}")
        return archivos_lista
        
    except Exception as e:
        logger.error(f"Error al obtener archivos: {e}")
        return []
def limpiar_base_datos() -> dict:
    """
    Elimina todos los documentos de la colección RagPAE en Weaviate.
    """
    try:
        logger.info("Iniciando limpieza de la base de datos vectorial.")
        
        # Configurar cliente v4 según si es Cloud o Local
        is_cloud = WEAVIATE_API_KEY and ("weaviate.network" in WEAVIATE_URL or "weaviate.cloud" in WEAVIATE_URL or "wcs" in WEAVIATE_URL)
        
        if is_cloud:
            weaviate_client = weaviate.connect_to_weaviate_cloud(
                cluster_url=WEAVIATE_URL,
                auth_credentials=Auth.api_key(WEAVIATE_API_KEY),
                headers={
                    "X-OpenAI-Api-Key": OPENAI_APIKEY
                }
            )
        else:
            url_clean = WEAVIATE_URL.replace("http://", "").replace("https://", "")
            if ":" in url_clean:
                host, port_str = url_clean.split(":")
                port = int(port_str.split("/")[0])
            else:
                host = url_clean.split("/")[0]
                port = 8080
            
            weaviate_client = weaviate.connect_to_local(
                host=host,
                port=port,
                headers={
                    "X-OpenAI-Api-Key": OPENAI_APIKEY
                }
            )
        
        # Borrar la colección completa y recrearla
        if weaviate_client.collections.exists("RagPAE"):
            weaviate_client.collections.delete("RagPAE")
            logger.info("Colección RagPAE eliminada.")
            
            # Recrear la colección vacía
            weaviate_client.collections.create(
                name="RagPAE",
                vectorizer_config=Configure.Vectorizer.text2vec_openai(
                    model="text-embedding-3-small"
                ),
                properties=[
                    Property(name="content", data_type=DataType.TEXT),
                    Property(name="metadata", data_type=DataType.TEXT)
                ]
            )
            logger.info("Colección RagPAE recreada vacía.")
        
        weaviate_client.close()
        
        # También limpiar el historial de conversación
        limpiar_historial()
        
        return {"success": True, "message": "Base de datos limpiada exitosamente"}
    except Exception as e:
        logger.error(f"Error al limpiar la base de datos: {e}")
        return {"success": False, "message": f"Error al limpiar: {str(e)}"}