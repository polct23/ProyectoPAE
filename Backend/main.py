from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware

class DatasetMeta(BaseModel):
    id: int
    title: str
    description: str
    format: str
    lastUpdate: str
    category: str
    coverage: str
    link: str

DATASETS = [
    {
      "id": 1,
      "title": "SCT – Incidències viàries Catalunya",
      "description": "Retencions, accidents/obres i estat general de la carretera",
      "format": "XML",
      "lastUpdate": "20/10/2025",
      "category": "Mobilitat",
      "coverage": "Catalunya (inclou AMB)",
      "link": "https://www.gencat.cat/transit/opendata/incidenciesGML.xml"
    },
    {
      "id": 2,
      "title": "SCT – Portal Open Data (Transport)",
      "description": "Incidències viàries i transport públic (Rodalies). Filtrable per comarca",
      "format": "XML",
      "lastUpdate": "20/10/2025",
      "category": "Mobilitat",
      "coverage": "Catalunya",
      "link": "https://analisi.transparenciacatalunya.cat/?sortBy=relevance&pageSize=20&category=Transport"
    },
    {
      "id": 3,
      "title": "Open Data BCN – Transport",
      "description": "Informació general sobre trànsit i mobilitat de vehicles i bicicletes",
      "format": "JSON / CSV",
      "lastUpdate": "20/10/2025",
      "category": "Mobilitat",
      "coverage": "Barcelona ciutat",
      "link": "https://opendata-ajuntament.barcelona.cat/data/ca/organitzacio/transport"
    },
    {
      "id": 4,
      "title": "TMB – Rutes i parades (Transit API)",
      "description": "Línies de bus i metro, parades i estat de servei",
      "format": "JSON / REST API",
      "lastUpdate": "20/10/2025",
      "category": "Transport públic",
      "coverage": "Catalunya",
      "link": "https://developer.tmb.cat/api-docs/v1/transit"
    },
    {
      "id": 5,
      "title": "AMB – Mobilitat urbana",
      "description": "Afeccions a carreteres, accidents, info ZBE i transport públic",
      "format": "CSV / JSON",
      "lastUpdate": "20/10/2025",
      "category": "Mobilitat",
      "coverage": "Comarques de l'AMB",
      "link": "https://www.amb.cat/s/web/mobilitat/mobilitat.html"
    },
    {
      "id": 6,
      "title": "Rodalies – Incidències",
      "description": "Incidències ferroviàries del servei de Rodalies",
      "format": "XML",
      "lastUpdate": "20/10/2025",
      "category": "Transport públic",
      "coverage": "Barcelona i municipis propers",
      "link": "https://www.gencat.cat/rodalies/incidencies_rodalies_rss_ca_ES.xml"
    },
    {
      "id": 7,
      "title": "DGT 3.0 – Trànsit temps real",
      "description": "Informació general de trànsit i alertes en temps real",
      "format": "API REST",
      "lastUpdate": "20/10/2025",
      "category": "Mobilitat",
      "coverage": "Espanya",
      "link": "https://github.com/dgt30-esp"
    }
]

app = FastAPI(title="Demo RACC API")

# Ajusta allow_origins en producción
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:4001",
        "http://localhost:8000",
        "http://10.4.120.105",      
        "http://10.4.120.105:80",    
        "http://pa1-api.upc.edu"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/datasets", response_model=List[DatasetMeta])
def get_datasets():
    return DATASETS


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)