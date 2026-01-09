import requests
from lxml import etree
from typing import List, Dict


def extraer_coordenadas_xml(url: str = "https://www.gencat.cat/transit/opendata/incidenciesGML.xml") -> List[Dict]:
    """
    Extrae las coordenadas del archivo XML de incidencias viarias de la Generalitat.
    
    Args:
        url: URL del XML de incidencias (por defecto usa el de incidenciesGML.xml)
    
    Returns:
        Lista de diccionarios con información de coordenadas e incidencias
    """
    try:
        # Descargar el XML
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        # Parsear el XML
        root = etree.fromstring(response.content)
        
        # Definir namespaces
        namespaces = {
            'gml': 'http://www.opengis.net/gml',
            'cite': 'http://www.opengeospatial.net/cite',
            'wfs': 'http://www.opengis.net/wfs'
        }
        
        coordenadas_list = []
        
        # Buscar todos los featureMember
        for feature in root.xpath('.//gml:featureMember', namespaces=namespaces):
            # Buscar gml:coordinates dentro de cada feature
            coords_elem = feature.find('.//gml:coordinates', namespaces)
            
            if coords_elem is not None and coords_elem.text:
                # Formato: "lon,lat" (ej: "2.55206464,41.86143144")
                coord_text = coords_elem.text.strip()
                parts = coord_text.split(',')
                
                if len(parts) >= 2:
                    try:
                        lon = float(parts[0])
                        lat = float(parts[1])
                        
                        coordenadas_list.append({
                            'lat': lat,
                            'lon': lon,
                            'tipo': 'point'
                        })
                    except ValueError:
                        continue
        
        # Print de las coordenadas extraídas
        print(f"\n📍 Coordenadas extraídas ({len(coordenadas_list)} total):")
        for i, coord in enumerate(coordenadas_list, 1):
            print(f"  {i}. lat: {coord['lat']}, lon: {coord['lon']}")
        
        return coordenadas_list
    
    except requests.exceptions.RequestException as e:
        print(f"Error al descargar el XML: {e}")
        return []
    except etree.XMLSyntaxError as e:
        print(f"Error al parsear el XML: {e}")
        return []
    except Exception as e:
        print(f"Error inesperado: {e}")
        return []


def extraer_coordenadas_con_detalles(url: str = "https://www.gencat.cat/transit/opendata/incidenciesGML.xml") -> List[Dict]:
    """
    Extrae coordenadas junto con información adicional de las incidencias.
    
    Args:
        url: URL del XML de incidencias
    
    Returns:
        Lista de diccionarios con coordenadas y detalles de la incidencia
    """
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        root = etree.fromstring(response.content)
        
        namespaces = {
            'gml': 'http://www.opengis.net/gml',
            'cite': 'http://www.opengeospatial.net/cite',
            'wfs': 'http://www.opengis.net/wfs'
        }
        
        incidencias = []
        
        # Buscar todos los featureMember
        for feature in root.xpath('.//gml:featureMember', namespaces=namespaces):
            # Extraer coordenadas
            coords_elem = feature.find('.//gml:coordinates', namespaces)
            
            if coords_elem is not None and coords_elem.text:
                coord_text = coords_elem.text.strip()
                parts = coord_text.split(',')
                
                if len(parts) >= 2:
                    try:
                        lon = float(parts[0])
                        lat = float(parts[1])
                        
                        # Extraer información adicional
                        afectacion = feature.find('.//cite:mct2_v_afectacions_data', namespaces)
                        
                        incidencia = {
                            'lat': lat,
                            'lon': lon,
                            'carretera': None,
                            'pk_inici': None,
                            'pk_fi': None,
                            'descripcion': None,
                            'tipo': None,
                            'causa': None,
                            'nivel': None,
                            'sentit': None,
                            'cap_a': None,
                            'data': None,
                            'subtipus': None
                        }
                        
                        if afectacion is not None:
                            for elem in afectacion:
                                tag = elem.tag.split('}')[-1]
                                
                                if tag == 'carretera':
                                    incidencia['carretera'] = elem.text
                                elif tag == 'pk_inici':
                                    incidencia['pk_inici'] = elem.text
                                elif tag == 'pk_fi':
                                    incidencia['pk_fi'] = elem.text
                                elif tag == 'descripcio':
                                    incidencia['descripcion'] = elem.text
                                elif tag == 'descripcio_tipus':
                                    incidencia['tipo'] = elem.text
                                elif tag == 'causa':
                                    incidencia['causa'] = elem.text
                                elif tag == 'nivell':
                                    incidencia['nivel'] = elem.text
                                elif tag == 'sentit':
                                    incidencia['sentit'] = elem.text
                                elif tag == 'cap_a':
                                    incidencia['cap_a'] = elem.text
                                elif tag == 'data':
                                    incidencia['data'] = elem.text
                                elif tag == 'subtipus':
                                    incidencia['subtipus'] = elem.text
                        
                        incidencias.append(incidencia)
                    except ValueError:
                        continue
        
        return incidencias
    
    except Exception as e:
        print(f"Error al extraer coordenadas con detalles: {e}")
        return []


# Ejecutar cuando se llama directamente el script
if __name__ == "__main__":
    print("Extrayendo coordenadas del XML...\n")
    coordenadas = extraer_coordenadas_xml()
    
    if coordenadas:
        print(f"\n✅ Extracción completada exitosamente!")
    else:
        print(f"\n❌ No se encontraron coordenadas o hubo un error.")