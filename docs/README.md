# GitHub Pages - RACC Mobility Ontology

Este directorio contiene los archivos estáticos para publicar la ontología RACC Mobility en GitHub Pages.

## Configuración de GitHub Pages

Para activar GitHub Pages en este repositorio:

1. Ve a **Settings** → **Pages** en tu repositorio de GitHub
2. En **Source**, selecciona:
   - Branch: `main`
   - Folder: `/docs`
3. Haz clic en **Save**

GitHub Pages generará automáticamente tu sitio en:
```
https://<tu-usuario>.github.io/<nombre-repo>/
```

## Archivos incluidos

- **index.html** - Página de documentación principal
- **raccmobilityontology.ttl** - Ontología en formato Turtle (RDF)
- **racc-context.jsonld** - Contexto JSON-LD
- **.nojekyll** - Evita el procesamiento de Jekyll

## URLs de los recursos

Una vez publicado, los archivos estarán disponibles en:

- Página principal: `https://<tu-usuario>.github.io/<nombre-repo>/`
- Ontología Turtle: `https://<tu-usuario>.github.io/<nombre-repo>/raccmobilityontology.ttl`
- Contexto JSON-LD: `https://<tu-usuario>.github.io/<nombre-repo>/racc-context.jsonld`

## Uso del contexto JSON-LD

Para usar el contexto en tus documentos JSON-LD:

```json
{
  "@context": "https://<tu-usuario>.github.io/<nombre-repo>/racc-context.jsonld",
  "@type": "racc:TrafficIncident",
  ...
}
```

## Notas

- El archivo `.nojekyll` asegura que GitHub Pages sirva los archivos directamente sin procesamiento Jekyll
- Los archivos se sirven como contenido estático sin necesidad de build o GitHub Actions
- La configuración es mínima y solo requiere los archivos en este directorio

## Licencia

Este contenido está licenciado bajo [Creative Commons BY 4.0](https://creativecommons.org/licenses/by/4.0/)
