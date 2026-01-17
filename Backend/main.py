from typing import Optional, List
from collections import Counter
from fastapi import FastAPI, HTTPException, Depends, Request, Response, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import SQLModel, Field, create_engine, Session, select
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
import uuid
import requests
from lxml import etree
from io import StringIO
from analizar_dataset_1 import extraer_incidencias
from datasets import extraer_coordenadas_xml, extraer_coordenadas_con_detalles
import os
import json
import csv
import xml.etree.ElementTree as ET


app = FastAPI()
HF_API_TOKEN = os.getenv("HF_API_TOKEN")
HF_ENDPOINT = "https://api-inference.huggingface.co/models/gpt2"


    
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./database.db")

# Security settings
SECRET_KEY = os.getenv("SECRET_KEY", "CHANGEME_GENERATE_A_STRONG_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

class User(SQLModel, table=True):
    __table_args__ = {"extend_existing": True}
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str
    hashed_password: str

class RefreshToken(SQLModel, table=True):
    __table_args__ = {"extend_existing": True}
    id: Optional[int] = Field(default=None, primary_key=True)
    jti: str
    user_id: int
    expires_at: datetime
    revoked: bool = False

class Dataset(SQLModel, table=True):
    __table_args__ = {"extend_existing": True}
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    format: str
    lastUpdate: str
    category: str
    coverage: str
    link: str
    logo: Optional[str] = None

DATASETS = [
    {
      "id": 1,
      "title": "Dataset RACC",
      "description": "Informació pròpia de l'empresa RACC sobre incidències viàries a Catalunya",
      "format": "CSV",
      "lastUpdate": "Gener 2026",
      "category": "Mobilitat",
      "coverage": "Catalunya",
      "link": "/dataset_racc/dataset_racc.xlsx",
      "logo": "/racc.png"
    },
    {
      "id": 2,
      "title": "SCT – Incidències viàries Catalunya",
      "description": "Retencions, accidents/obres i estat general de la carretera",
      "format": "XML",
      "lastUpdate": "20/10/2025",
      "category": "Mobilitat",
      "coverage": "Catalunya (inclou AMB)",
      "link": "https://www.gencat.cat/transit/opendata/incidenciesGML.xml",
      "logo": "/gencat.jpg"
    },
    {
      "id": 3,
      "title": "SCT – Portal Open Data (Transport)",
      "description": "Incidències viàries i transport públic (Rodalies). Filtrable per comarca",
      "format": "XML",
      "lastUpdate": "20/10/2025",
      "category": "Mobilitat",
      "coverage": "Catalunya",
      "link": "https://analisi.transparenciacatalunya.cat/?sortBy=relevance&pageSize=20&category=Transport",
      "logo": "/dades.png"
    },
    {
      "id": 4,
      "title": "Open Data BCN – Transport",
      "description": "Informació general sobre trànsit i mobilitat de vehicles i bicicletes",
      "format": "JSON / CSV",
      "lastUpdate": "20/10/2025",
      "category": "Mobilitat",
      "coverage": "Barcelona ciutat",
      "link": "https://opendata-ajuntament.barcelona.cat/data/ca/organitzacio/transport",
      "logo": "/ajuntamentbcn.jpg"
    },
    {
      "id": 5,
      "title": "TMB – Rutes i parades (Transit API)",
      "description": "Línies de bus i metro, parades i estat de servei",
      "format": "JSON / REST API",
      "lastUpdate": "20/10/2025",
      "category": "Transport públic",
      "coverage": "Catalunya",
      "link": "https://developer.tmb.cat/api-docs/v1/transit",
      "logo": "img_header_logotmb_red.jpg"
    },
    {
      "id": 6,
      "title": "AMB – Mobilitat urbana",
      "description": "Afeccions a carreteres, accidents, info ZBE i transport públic",
      "format": "CSV / JSON",
      "lastUpdate": "20/10/2025",
      "category": "Mobilitat",
      "coverage": "Comarques de l'AMB",
      "link": "https://www.amb.cat/s/web/mobilitat/mobilitat.html",
      "logo": "/amb.jpg"
    },
    {
      "id": 7,
      "title": "Rodalies – Incidències",
      "description": "Incidències ferroviàries del servei de Rodalies",
      "format": "XML",
      "lastUpdate": "20/10/2025",
      "category": "Transport públic",
      "coverage": "Barcelona i municipis propers",
      "link": "https://www.gencat.cat/rodalies/incidencies_rodalies_rss_ca_ES.xml",
      "logo": "/rodalies.jpg"
    },
    {
      "id": 8,
      "title": "DGT 3.0 – Trànsit temps real",
      "description": "Informació general de trànsit i alertes en temps real",
      "format": "API REST",
      "lastUpdate": "20/10/2025",
      "category": "Mobilitat",
      "coverage": "Espanya",
      "link": "https://github.com/dgt30-esp",
      "logo": "/dgt.jpg"
    }
]
app = FastAPI(title="Proyecto PAE - Backend (SQLite)")

# CORS abierto para frontend dockerizado (80/localhost). Ajustable con FRONTEND_ORIGIN.
frontend_origins = os.getenv("FRONTEND_ORIGIN")
default_origins = ["http://localhost", "http://localhost:80", "http://localhost:3000"]
origins = [o.strip() for o in (frontend_origins.split(",") if frontend_origins else default_origins)]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})

def get_session():
    with Session(engine) as session:
        yield session

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")  # for FastAPI docs

# Token helpers
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(user_id: int, expires_delta: Optional[timedelta] = None):
    jti = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    payload = {"jti": jti, "sub": str(user_id), "exp": expire, "iat": now}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token, jti, expire

def verify_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

# Dependency: validates Authorization Bearer <access_token>
def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    if not token:
        raise HTTPException(status_code=401, detail="No se ha proporcionado token")
    user_id = verify_access_token(token)
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no válido")
    return user

@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        count = session.exec(select(Dataset)).all()
        if len(count) == 0:
            for d in DATASETS:
                if session.get(Dataset, d["id"]) is None:
                    session.add(Dataset(**d))
            session.commit()
        if not session.exec(select(User).where(User.username == "admin")).first():
            hashed = pwd_context.hash("admin")
            session.add(User(username="admin", hashed_password=hashed))
            session.commit()

# --- Auth endpoints (tokens in JSON body) ---

@app.post("/login")
def login(data: dict, session: Session = Depends(get_session)):
    username = data.get("username")
    password = data.get("password")
    user = session.exec(select(User).where(User.username == username)).first()
    if not user or not pwd_context.verify(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token, jti, expires_at = create_refresh_token(user.id)

    rt = RefreshToken(jti=jti, user_id=user.id, expires_at=expires_at, revoked=False)
    session.add(rt)
    session.commit()

    # RETURN both tokens in JSON (client will store refresh token)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "username": username}

@app.post("/refresh")
def refresh(data: dict, session: Session = Depends(get_session)):
    refresh_token = data.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        jti = payload.get("jti")
        user_id = int(payload.get("sub"))
    except JWTError:
        raise HTTPException(status_code=401, detail="Refresh token inválido")

    rt = session.exec(select(RefreshToken).where(RefreshToken.jti == jti)).first()
    if not rt or rt.revoked:
        raise HTTPException(status_code=401, detail="Refresh token revocado o no encontrado")

    expires_at = rt.expires_at
    if expires_at.tzinfo is None or expires_at.tzinfo.utcoffset(expires_at) is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token expirado")

    # rotate: revoke old and create new
    rt.revoked = True
    session.add(rt)
    new_refresh_token, new_jti, new_expires_at = create_refresh_token(user_id)
    new_rt = RefreshToken(jti=new_jti, user_id=user_id, expires_at=new_expires_at, revoked=False)
    session.add(new_rt)
    session.commit()

    access_token = create_access_token({"sub": str(user_id)})
    return {"access_token": access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}

@app.post("/logout")
def logout(data: dict, session: Session = Depends(get_session)):
    refresh_token = data.get("refresh_token")
    if refresh_token:
        try:
            payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            jti = payload.get("jti")
            rt = session.exec(select(RefreshToken).where(RefreshToken.jti == jti)).first()
            if rt:
                rt.revoked = True
                session.add(rt)
                session.commit()
        except JWTError:
            pass
    return {"msg": "Logged out"}

@app.get("/me")
def me(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    user_id = verify_access_token(token)
    user = session.get(User, user_id)
    return {"username": user.username}

# --- Public endpoints ---
@app.get("/datasets", response_model=List[Dataset])
def list_datasets(session: Session = Depends(get_session)):
    results = session.exec(select(Dataset).order_by(Dataset.id)).all()
    return results

@app.get("/datasets/{dataset_id}", response_model=Dataset)
def get_dataset(dataset_id: int, session: Session = Depends(get_session)):
    ds = session.get(Dataset, dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")
    return ds

# --- Protected endpoints ---
@app.post("/datasets", response_model=Dataset, status_code=201)
def create_dataset(payload: Dataset, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if session.get(Dataset, payload.id):
        raise HTTPException(status_code=400, detail="Dataset con ese id ya existe")
    session.add(payload)
    session.commit()
    session.refresh(payload)
    return payload

@app.post("/datasets/upload", response_model=Dataset, status_code=201)
def upload_dataset(
    file: UploadFile = File(...),
    format: str = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    coverage: str = Form(...),
    lastUpdate: str = Form(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Upload a dataset file (CSV, JSON, or XML)"""
    try:
        # Validate file format
        allowed_formats = ['CSV', 'JSON', 'XML']
        if format.upper() not in allowed_formats:
            raise HTTPException(status_code=400, detail=f"Format deve ser un de: {', '.join(allowed_formats)}")
        
        # Read file content
        content = file.file.read()
        
        # Validate content based on format
        try:
            if format.upper() == 'JSON':
                json.loads(content if isinstance(content, str) else content.decode('utf-8'))
            elif format.upper() == 'CSV':
                # Basic CSV validation
                text_content = content if isinstance(content, str) else content.decode('utf-8')
                csv.reader(StringIO(text_content))
            elif format.upper() == 'XML':
                ET.fromstring(content)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid {format} content: {str(e)}")
        
        # Generate next ID
        existing = session.exec(select(Dataset)).all()
        next_id = max([d.id for d in existing], default=0) + 1
        
        # Create dataset record
        new_dataset = Dataset(
            id=next_id,
            title=title,
            description=description,
            format=format.upper(),
            lastUpdate=lastUpdate,
            category=category,
            coverage=coverage,
            link=f"uploaded_by_{user.username}",
            logo=None
        )
        
        session.add(new_dataset)
        session.commit()
        session.refresh(new_dataset)
        
        return new_dataset
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading dataset: {str(e)}")

@app.put("/datasets/{dataset_id}", response_model=Dataset)
def update_dataset(dataset_id: int, payload: Dataset, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    existing = session.get(Dataset, dataset_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")
    for field in payload.__fields_set__:
        setattr(existing, field, getattr(payload, field))
    session.add(existing)
    session.commit()
    session.refresh(existing)
    return existing

@app.delete("/datasets/{dataset_id}", status_code=204)
def delete_dataset(dataset_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    existing = session.get(Dataset, dataset_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")
    session.delete(existing)
    session.commit()
    return

@app.get("/configuracion")
def configuracion(user: User = Depends(get_current_user)):
    return {"config": "Solo admin puede ver esto"}


# --- Incidències de trànsit (SCT) ---
def _safe_incidencies_detallades() -> List[dict]:
    """Obtiene incidencias detalladas manejando errores de red/XML."""
    try:
        incidencies = extraer_coordenadas_con_detalles()
        return incidencies or []
    except Exception as exc:  # pragma: no cover - logging prop
        print(f"Error obtenint incidencies: {exc}")
        return []


def _parse_nivel(valor) -> int:
    try:
        return int(valor)
    except Exception:
        return 0


@app.get("/api/incidencies/raw")
def api_incidencies_raw():
    incidencies = _safe_incidencies_detallades()
    return {"incidencies": incidencies, "total": len(incidencies)}


@app.get("/api/incidencies/summary")
def api_incidencies_summary():
    incidencies = _safe_incidencies_detallades()
    total = len(incidencies)
    greus = sum(1 for inc in incidencies if _parse_nivel(inc.get("nivel")) >= 3)
    percent_greus = (greus / total * 100) if total else 0.0

    carretera_counts = Counter(str(inc.get("carretera") or "Desconeguda") for inc in incidencies)
    top = carretera_counts.most_common(1)
    via_mes_afectada = None
    if top:
        via, count = top[0]
        via_mes_afectada = {"carretera": via, "incidents": count}

    return {
        "total_incidents": total,
        "percent_greus": percent_greus,
        "via_mes_afectada": via_mes_afectada,
    }


@app.get("/api/incidencies/by_tipo")
def api_incidencies_by_tipo():
    incidencies = _safe_incidencies_detallades()
    counts = Counter(str(inc.get("tipo") or "Desconegut") for inc in incidencies)
    return [
        {"tipo": tipo, "count": total}
        for tipo, total in counts.most_common()
    ]


@app.get("/api/incidencies/by_nivel")
def api_incidencies_by_nivel():
    incidencies = _safe_incidencies_detallades()
    counts = Counter(_parse_nivel(inc.get("nivel")) for inc in incidencies)
    ordered = sorted(counts.items(), key=lambda x: x[0])
    return [{"nivel": nivel, "count": total} for nivel, total in ordered]


@app.get("/api/incidencies/ranking_trams")
def api_incidencies_ranking_trams():
    incidencies = _safe_incidencies_detallades()
    ranking = {}

    for inc in incidencies:
        carretera = str(inc.get("carretera") or "Desconeguda")
        info = ranking.setdefault(
            carretera,
            {"carretera": carretera, "incidents": 0, "max_nivel": 0, "_tipos": Counter()},
        )
        info["incidents"] += 1
        info["max_nivel"] = max(info["max_nivel"], _parse_nivel(inc.get("nivel")))
        info["_tipos"].update([str(inc.get("tipo") or "Desconegut")])

    resultado = []
    for carretera, data in ranking.items():
        tipo_principal = None
        if data["_tipos"]:
            tipo_principal = data["_tipos"].most_common(1)[0][0]
        resultado.append(
            {
                "carretera": carretera,
                "incidents": data["incidents"],
                "max_nivel": data["max_nivel"],
                "tipo_principal": tipo_principal,
            }
        )

    resultado.sort(key=lambda x: x["incidents"], reverse=True)
    return resultado[:10]

@app.get("/coordenadas")
def obtener_coordenadas():
    """Endpoint público que obtiene coordenadas en tiempo real del XML de incidencias"""
    coordenadas = extraer_coordenadas_xml()
    return {"coordenadas": coordenadas, "total": len(coordenadas)}

@app.get("/incidencias")
def obtener_incidencias():
    """Endpoint público que obtiene incidencias con detalles del XML"""
    incidencias = extraer_coordenadas_con_detalles()
    return {"incidencias": incidencias, "total": len(incidencias)}

@app.post("/chatbot/ask")
async def chatbot_ask(data: dict):
    context = data.get("context", "")
    question = data.get("question", "")
    if not context or not question:
        raise HTTPException(status_code=400, detail="Faltan datos")
    prompt = f"Contesta a la siguiente pregunta usando solo la información de estos documentos:\n{context}\n\nPregunta: {question}\nRespuesta:"
    headers = {
        "Authorization": f"Bearer {HF_API_TOKEN}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    payload = { "inputs": prompt }
    try:
        response = requests.post(HF_ENDPOINT, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
        # El formato puede variar según el modelo
        if isinstance(data, list):
            answer = data[0].get("generated_text", "Sin respuesta")
        elif isinstance(data, dict) and "generated_text" in data:
            answer = data["generated_text"]
        elif "error" in data:
            answer = f"Error: {data['error']}"
        else:
            answer = str(data)
        return { "answer": answer }
    except Exception as e:
        return { "error": str(e) }

# ==================== FUNCIONES XML TO TXT ====================

def descargar_xml(url: str) -> str:
    """Descarga un archivo XML de una URL"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Error descargando XML: {str(e)}")

def xml_to_txt(xml_content: str) -> str:
    """Convierte contenido XML a formato TXT legible"""
    try:
        # Parsear el XML
        root = etree.fromstring(xml_content.encode('utf-8'))
        
        output = StringIO()
        output.write("=" * 80 + "\n")
        output.write("CONTENIDO XML CONVERTIDO A TXT\n")
        output.write("=" * 80 + "\n\n")
        
        # Procesar recursivamente los elementos
        def procesar_elemento(elemento, nivel=0):
            indentacion = "  " * nivel
            
            # Escribir nombre del elemento
            output.write(f"{indentacion}[{elemento.tag}]\n")
            
            # Escribir atributos si existen
            if elemento.attrib:
                for attr_name, attr_value in elemento.attrib.items():
                    output.write(f"{indentacion}  @{attr_name}: {attr_value}\n")
            
            # Escribir texto del elemento
            if elemento.text and elemento.text.strip():
                output.write(f"{indentacion}  > {elemento.text.strip()}\n")
            
            # Procesar elementos hijos
            for hijo in elemento:
                procesar_elemento(hijo, nivel + 1)
                # Escribir texto de cola (tail) si existe
                if hijo.tail and hijo.tail.strip():
                    output.write(f"{indentacion}  {hijo.tail.strip()}\n")
        
        procesar_elemento(root)
        output.write("\n" + "=" * 80 + "\n")
        
        return output.getvalue()
    except etree.XMLSyntaxError as e:
        raise HTTPException(status_code=400, detail=f"Error parseando XML: {str(e)}")
# ==================== ANÁLISIS DATASET 1 ====================

def _build_stats(incidencias: List[dict]) -> dict:
    """Construye estadísticas a partir de incidencias"""
    def top10(d: dict):
        return sorted(d.items(), key=lambda x: x[1], reverse=True)[:10]

    tipos, causas, carreteras, niveles = {}, {}, {}, {}
    for inc in incidencias:
        tipos[str(inc.get('tipus', 'desconegut'))] = tipos.get(str(inc.get('tipus', 'desconegut')), 0) + 1
        causas[str(inc.get('causa', 'desconeguda'))] = causas.get(str(inc.get('causa', 'desconeguda')), 0) + 1
        carreteras[str(inc.get('carretera', 'desconeguda'))] = carreteras.get(str(inc.get('carretera', 'desconeguda')), 0) + 1
        niveles[str(inc.get('nivell', 'desconegut'))] = niveles.get(str(inc.get('nivell', 'desconegut')), 0) + 1

    return {
        "total": len(incidencias),
        "byType": tipos,
        "byCauseTop": top10(causas),
        "byRoadTop": top10(carreteras),
        "bySeverity": niveles,
        "sample": incidencias[0] if incidencias else None,
    }

@app.get("/datasets/{dataset_id}/analyze-xml")
def analyze_dataset_xml(dataset_id: int, user: User = Depends(get_current_user)):
    """
    Analiza el XML del dataset 1 (SCT Incidències) extrayendo estadísticas
    """
    dataset = next((d for d in DATASETS if d["id"] == dataset_id), None)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")
    if dataset_id != 1:
        raise HTTPException(status_code=400, detail="Análisis disponible sólo para el dataset 1")
    if dataset.get("format") != "XML":
        raise HTTPException(status_code=400, detail="Este dataset no es de formato XML")

    xml_content = descargar_xml(dataset["link"])
    try:
        incidencias = extraer_incidencias(xml_content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error extrayendo incidencias: {str(e)}")
    
    stats = _build_stats(incidencias)

    return {
        "dataset_id": dataset_id,
        "dataset_title": dataset["title"],
        "total_chars": len(xml_content),
        "stats": stats,
        "incidences": incidencias[:50],
    }

@app.get("/datasets/{dataset_id}/xml-to-txt")
def convertir_dataset_xml_a_txt(dataset_id: int, user: User = Depends(get_current_user)):
    """
    Descarga el XML de un dataset y lo convierte a TXT
    """
    # Buscar el dataset
    dataset = None
    for ds in DATASETS:
        if ds["id"] == dataset_id:
            dataset = ds
            break
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")
    
    # Verificar que sea XML
    if dataset.get("format") != "XML":
        raise HTTPException(status_code=400, detail="Este dataset no es de formato XML")
    
    # Descargar el XML
    xml_content = descargar_xml(dataset["link"])
    
    # Convertir a TXT
    txt_content = xml_to_txt(xml_content)
    
    return {
        "dataset_id": dataset_id,
        "dataset_title": dataset["title"],
        "content": txt_content,
        "tamanio": len(txt_content),
        "caracteres": len(xml_content)
    }

@app.get("/datasets/{dataset_id}/xml-download")
def descargar_xml_dataset(dataset_id: int, user: User = Depends(get_current_user)):
    """
    Descarga el XML raw de un dataset
    """
    # Buscar el dataset
    dataset = None
    for ds in DATASETS:
        if ds["id"] == dataset_id:
            dataset = ds
            break
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")
    
    if dataset.get("format") != "XML":
        raise HTTPException(status_code=400, detail="Este dataset no es de formato XML")
    
    # Descargar el XML
    xml_content = descargar_xml(dataset["link"])
    
    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={"Content-Disposition": f"attachment; filename={dataset['title']}.xml"}
    )

# ==================== GRAFANA ENDPOINTS ====================

@app.get("/grafana/incidents/total")
def grafana_total_incidents():
    """Total de incidencias activas"""
    try:
        incidencias = extraer_coordenadas_con_detalles()
        return {"value": len(incidencias)}
    except Exception as e:
        return {"value": 0, "error": str(e)}


@app.get("/grafana/incidents/per-hour")
def grafana_incidents_per_hour():
    """Ritmo medio de incidencias por hora (estimado sobre las últimas 24h)"""
    try:
        incidencias = extraer_coordenadas_con_detalles()
        hours = 24
        rate = (len(incidencias) / hours) if hours else 0
        return {"value": round(rate, 2)}
    except Exception as e:
        return {"value": 0, "error": str(e)}

@app.get("/grafana/accidents/today-count")
def grafana_accidents_today():
    """Contar retenciones activas"""
    try:
        incidencias = extraer_coordenadas_con_detalles()
        retenciones = [inc for inc in incidencias if inc.get('tipo') and 'retenc' in inc.get('tipo', '').lower()]
        return {"value": len(retenciones)}
    except Exception as e:
        return {"value": 0, "error": str(e)}

@app.get("/grafana/accidents/by-type")
def grafana_accidents_by_type():
    """Incidencias por tipo"""
    try:
        incidencias = extraer_coordenadas_con_detalles()
        
        tipos = {}
        for inc in incidencias:
            tipo = inc.get('tipo', 'Desconocido')
            if tipo:  # Solo contar si el tipo no es None
                tipos[tipo] = tipos.get(tipo, 0) + 1
        
        return [{"tipo": k, "cantidad": v} for k, v in tipos.items()]
    except Exception as e:
        return []


def _filter_severe(incidencias):
    return [inc for inc in incidencias if inc.get('nivel') and int(inc.get('nivel', 0)) >= 3]


@app.get("/grafana/incidents/severe-count")
def grafana_incidents_severe_count():
    """Total de incidencias con nivel >= 3"""
    try:
        incidencias = extraer_coordenadas_con_detalles()
        graves = _filter_severe(incidencias)
        return {"value": len(graves)}
    except Exception as e:
        return {"value": 0, "error": str(e)}


@app.get("/grafana/incidents/avg-severity")
def grafana_incidents_avg_severity():
    """Media de nivel de severidad"""
    try:
        incidencias = extraer_coordenadas_con_detalles()
        niveles = [int(inc.get('nivel')) for inc in incidencias if inc.get('nivel')]
        if not niveles:
            return {"value": 0}
        return {"value": round(sum(niveles) / len(niveles), 2)}
    except Exception as e:
        return {"value": 0, "error": str(e)}


@app.get("/grafana/incidents/severe-distinct-roads")
def grafana_incidents_severe_distinct_roads():
    """Número de carreteras con incidencias graves (nivel >=3)"""
    try:
        incidencias = extraer_coordenadas_con_detalles()
        graves = _filter_severe(incidencias)
        roads = {inc.get('carretera') for inc in graves if inc.get('carretera')}
        return {"value": len(roads)}
    except Exception as e:
        return {"value": 0, "error": str(e)}


@app.get("/grafana/incidents/severe-by-cause")
def grafana_incidents_severe_by_cause():
    """Causas de incidencias graves (nivel >=3)"""
    try:
        incidencias = extraer_coordenadas_con_detalles()
        graves = _filter_severe(incidencias)
        causes = {}
        for inc in graves:
            causa = inc.get('causa', 'Desconeguda')
            causes[causa] = causes.get(causa, 0) + 1
        sorted_causes = sorted(causes.items(), key=lambda x: x[1], reverse=True)[:10]
        return [{"causa": k, "cantidad": v} for k, v in sorted_causes]
    except Exception:
        return []


@app.get("/grafana/incidents/severe-by-type")
def grafana_incidents_severe_by_type():
    """Incidencias graves por tipo"""
    try:
        incidencias = extraer_coordenadas_con_detalles()
        graves = _filter_severe(incidencias)
        tipos = {}
        for inc in graves:
            tipo = inc.get('tipo', 'Desconegut')
            if tipo:
                tipos[tipo] = tipos.get(tipo, 0) + 1
        return [{"tipo": k, "cantidad": v} for k, v in sorted(tipos.items(), key=lambda x: x[1], reverse=True)]
    except Exception:
        return []


@app.get("/grafana/incidents/severe-by-road")
def grafana_incidents_severe_by_road():
    """Top carreteras con incidencias graves"""
    try:
        incidencias = extraer_coordenadas_con_detalles()
        graves = _filter_severe(incidencias)
        roads = {}
        for inc in graves:
            carretera = inc.get('carretera', 'Desconeguda')
            roads[carretera] = roads.get(carretera, 0) + 1
        sorted_roads = sorted(roads.items(), key=lambda x: x[1], reverse=True)[:10]
        return [{"carretera": k, "cantidad": v} for k, v in sorted_roads]
    except Exception:
        return []

@app.get("/grafana/accidents/by-severity")
def grafana_accidents_by_severity():
    """Incidencias por severidad"""
    try:
        incidencias = extraer_coordenadas_con_detalles()

        # Prellenamos niveles 1-5 para que el gráfico muestre barras aunque no haya casos
        severities = {str(i): 0 for i in range(1, 6)}
        for inc in incidencias:
            nivel_raw = inc.get('nivel')
            try:
                nivel = int(nivel_raw)
            except Exception:
                continue
            if nivel <= 0:
                continue
            key = str(nivel)
            severities[key] = severities.get(key, 0) + 1

        ordered = sorted(severities.items(), key=lambda x: int(x[0]))
        return [{"nivel": k, "cantidad": v} for k, v in ordered]
    except Exception as e:
        return []

@app.get("/grafana/accidents/by-road")
def grafana_accidents_by_road():
    """Top carreteras con más incidencias"""
    try:
        incidencias = extraer_coordenadas_con_detalles()
        
        roads = {}
        for inc in incidencias:
            carretera = inc.get('carretera', 'Desconocida')
            roads[carretera] = roads.get(carretera, 0) + 1
        
        sorted_roads = sorted(roads.items(), key=lambda x: x[1], reverse=True)[:10]
        return [{"carretera": k, "cantidad": v} for k, v in sorted_roads]
    except Exception as e:
        return []


def _region_from_incidence(inc: dict) -> str:
    """Clasifica en regiones gruesas para Grafana (evita 'Desconeguda')."""
    try:
        lat = float(inc.get('lat', 'nan'))
        lon = float(inc.get('lon', inc.get('lng', 'nan')))
    except Exception:
        lat = float('nan')
        lon = float('nan')

    carretera = (inc.get('carretera') or '').upper().strip()

    # Prefer coordenadas si existen
    if not (lat != lat or lon != lon):  # check for NaN
        if 41.2 <= lat <= 41.7 and 1.9 <= lon <= 2.5:
            return 'AMB'
        if 40.5 <= lat <= 43.8 and -1.5 <= lon <= 3.6:
            return 'Catalunya'

    # Fallbacks basados en carretera (B- suelen ser area BCN)
    if carretera.startswith('B-') or carretera.startswith('BV-'):
        return 'AMB'
    if carretera.startswith('C-') or carretera.startswith('AP-') or carretera.startswith('A-'):
        return 'Catalunya'

    return 'Desconeguda'


@app.get("/grafana/accidents/by-region")
def grafana_accidents_by_region():
    """Incidencias agrupadas por área (AMB vs Catalunya vs Desconeguda)."""
    try:
        incidencias = extraer_coordenadas_con_detalles()
        regions = {}
        for inc in incidencias:
            region = _region_from_incidence(inc)
            regions[region] = regions.get(region, 0) + 1
        sorted_regions = sorted(regions.items(), key=lambda x: x[1], reverse=True)
        return [{"area": k, "cantidad": v} for k, v in sorted_regions]
    except Exception:
        return []

@app.get("/grafana/accidents/distinct-roads")
def grafana_distinct_roads():
    """Número de carreteras distintas con incidencias activas"""
    try:
        incidencias = extraer_coordenadas_con_detalles()
        roads = set()
        for inc in incidencias:
            carretera = inc.get('carretera', 'Desconocida')
            if carretera and carretera != 'Desconocida':
                roads.add(carretera)
        return {"value": len(roads)}
    except Exception as e:
        return {"value": 0, "error": str(e)}

@app.get("/grafana/incidents/severity-percentage")
def grafana_severity_percentage():
    """Porcentaje de incidencias graves (nivel >= 3)"""
    try:
        incidencias = extraer_coordenadas_con_detalles()
        if not incidencias:
            return {"value": 0}
        
        graves = sum(1 for inc in incidencias if inc.get('nivel') and int(inc.get('nivel', 0)) >= 3)
        percentage = (graves / len(incidencias)) * 100
        return {"value": round(percentage, 2)}
    except Exception as e:
        return {"value": 0, "error": str(e)}

@app.get("/grafana/incidents/by-cause")
def grafana_incidents_by_cause():
    """Causas de incidencias"""
    try:
        incidencias = extraer_coordenadas_con_detalles()
        
        causes = {}
        for inc in incidencias:
            causa = inc.get('causa', 'Desconocida')
            causes[causa] = causes.get(causa, 0) + 1
        
        sorted_causes = sorted(causes.items(), key=lambda x: x[1], reverse=True)[:10]
        return [{"causa": k, "cantidad": v} for k, v in sorted_causes]
    except Exception as e:
        return []

@app.get("/grafana/dashboard/incidents-by-weekday")
def grafana_incidents_by_weekday():
    """Incidentes por día de la semana"""
    try:
        from datetime import datetime
        incidencias = extraer_coordenadas_con_detalles()
        
        # Mapeo de días de semana en catalán
        day_names = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte", "Diumenge"]
        day_counts = {day: 0 for day in day_names}
        
        # Contar incidencias por día de la semana basado en el campo 'data'
        for inc in incidencias:
            data = inc.get('data')
            if data:
                try:
                    # Parsear fecha formato: "Wed, 14 Jan 2026 12:51:30 GMT"
                    dt = datetime.strptime(data, "%a, %d %b %Y %H:%M:%S %Z")
                    weekday = dt.weekday()  # 0=Monday, 6=Sunday
                    day_counts[day_names[weekday]] += 1
                except:
                    pass
        
        return [{"day": day, "count": count} for day, count in day_counts.items()]
    except Exception as e:
        return []

@app.get("/grafana/dashboard/streets-closed")
def grafana_streets_closed():
    """Calles cortadas"""
    try:
        incidencias = extraer_coordenadas_con_detalles()
        
        # Filtrar solo las calles cortadas
        closed_streets = [
            {
                "carretera": inc.get('carretera', 'Desconocida'),
                "descripcion": inc.get('descripcion', ''),
                "tipo": inc.get('tipo', ''),
                "causa": inc.get('causa', ''),
                "nivel": inc.get('nivel', 0),
                "sentit": inc.get('sentit', '')
            }
            for inc in incidencias
            if (inc.get('descripcion') and 'tallat' in inc.get('descripcion', '').lower()) or 
               (inc.get('tipo') and 'tall' in inc.get('tipo', '').lower()) or 
               (inc.get('nivel') and int(inc.get('nivel', 0)) >= 4)
        ]
        
        return {"calles_cortadas": closed_streets, "total": len(closed_streets)}
    except Exception as e:
        return {"calles_cortadas": [], "total": 0}


@app.get("/grafana/dashboard/streets-closed/count")
def grafana_streets_closed_count():
    """Total de calles/carreteras cortadas"""
    try:
        data = grafana_streets_closed()
        return {"value": data.get("total", 0)} if isinstance(data, dict) else {"value": 0}
    except Exception as e:
        return {"value": 0, "error": str(e)}

@app.get("/api/incidents-map")
def incidents_map():
    """Retorna incidencias con coordenadas para visualizar en mapa"""
    try:
        incidencias = extraer_coordenadas_con_detalles()
        
        # Filtrar solo incidencias con coordenadas
        incidents_with_coords = [
            {
                "latitud": inc.get('lat'),
                "longitud": inc.get('lon'),
                "carretera": inc.get('carretera', 'Desconocida'),
                "descripcion": inc.get('descripcion', ''),
                "tipo": inc.get('tipo', ''),
                "causa": inc.get('causa', ''),
                "nivel": inc.get('nivel', 0),
                "sentit": inc.get('sentit', '')
            }
            for inc in incidencias
            if inc.get('lat') and inc.get('lon')
        ]
        
        return {"incidents": incidents_with_coords, "total": len(incidents_with_coords)}
    except Exception as e:
        return {"error": str(e), "incidents": [], "total": 0}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)