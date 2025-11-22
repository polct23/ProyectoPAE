export interface DatasetMeta {
  id: number;
  title: string;
  description: string;
  format: string; // e.g. "XML" or "JSON / CSV"
  lastUpdate: string; // DD/MM/YYYY
  category: string; // Mobilitat, Transport públic, etc.
  coverage: string; // Catalunya, Barcelona ciutat, Espanya, etc.
  link: string;
}

export const DATASETS: DatasetMeta[] = [
  {
    id: 1,
    title: 'SCT – Incidències viàries Catalunya',
    description: 'Retencions, accidents/obres i estat general de la carretera',
    format: 'XML',
    lastUpdate: '20/10/2025',
    category: 'Mobilitat',
    coverage: 'Catalunya (inclou AMB)',
    link: 'https://www.gencat.cat/transit/opendata/incidenciesGML.xml',
  },
  {
    id: 2,
    title: 'SCT – Portal Open Data (Transport)',
    description: 'Incidències viàries i transport públic (Rodalies). Filtrable per comarca',
    format: 'XML',
    lastUpdate: '20/10/2025',
    category: 'Mobilitat',
    coverage: 'Catalunya',
    link: 'https://analisi.transparenciacatalunya.cat/?sortBy=relevance&pageSize=20&category=Transport',
  },
  {
    id: 3,
    title: 'Open Data BCN – Transport',
    description: 'Informació general sobre trànsit i mobilitat de vehicles i bicicletes',
    format: 'JSON / CSV',
    lastUpdate: '20/10/2025',
    category: 'Mobilitat',
    coverage: 'Barcelona ciutat',
    link: 'https://opendata-ajuntament.barcelona.cat/data/ca/organitzacio/transport',
  },
  {
    id: 4,
    title: 'TMB – Rutes i parades (Transit API)',
    description: 'Línies de bus i metro, parades i estat de servei',
    format: 'JSON / REST API',
    lastUpdate: '20/10/2025',
    category: 'Transport públic',
    coverage: 'Catalunya',
    link: 'https://developer.tmb.cat/api-docs/v1/transit',
  },
  {
    id: 5,
    title: 'AMB – Mobilitat urbana',
    description: 'Afeccions a carreteres, accidents, info ZBE i transport públic',
    format: 'CSV / JSON',
    lastUpdate: '20/10/2025',
    category: 'Mobilitat',
    coverage: "Comarques de l'AMB",
    link: 'https://www.amb.cat/s/web/mobilitat/mobilitat.html',
  },
  {
    id: 6,
    title: 'Rodalies – Incidències',
    description: 'Incidències ferroviàries del servei de Rodalies',
    format: 'XML',
    lastUpdate: '20/10/2025',
    category: 'Transport públic',
    coverage: 'Barcelona i municipis propers',
    link: 'https://www.gencat.cat/rodalies/incidencies_rodalies_rss_ca_ES.xml',
  },
  {
    id: 7,
    title: 'DGT 3.0 – Trànsit temps real',
    description: 'Informació general de trànsit i alertes en temps real',
    format: 'API REST',
    lastUpdate: '20/10/2025',
    category: 'Mobilitat',
    coverage: 'Espanya',
    link: 'https://github.com/dgt30-esp',
  },
];
