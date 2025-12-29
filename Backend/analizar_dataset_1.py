#!/usr/bin/env python3
"""
Script avanzado para extraer y procesar datos del dataset 1 (Incidències viàries)
"""
import requests
from lxml import etree
import json
from datetime import datetime
from typing import List, Dict

# Dataset 1: SCT – Incidències viàries Catalunya
DATASET_URL = "https://www.gencat.cat/transit/opendata/incidenciesGML.xml"

def descargar_xml(url: str) -> str:
    """Descarga un archivo XML de una URL"""
    try:
        print(f"Descargando XML desde: {url}")
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        print(f"✓ XML descargado correctamente ({len(response.text)} caracteres)")
        return response.text
    except requests.RequestException as e:
        print(f"✗ Error descargando XML: {str(e)}")
        raise

def extraer_incidencias(xml_content: str) -> List[Dict]:
    """
    Extrae información estructurada de las incidencias del XML
    """
    try:
        print("\nExtrayendo incidencias...")
        root = etree.fromstring(xml_content.encode('utf-8'))
        
        # Definir namespaces
        namespaces = {
            'wfs': 'http://www.opengis.net/wfs',
            'gml': 'http://www.opengis.net/gml',
            'cite': 'http://www.opengeospatial.net/cite'
        }
        
        incidencias = []
        
        # Buscar todos los elementos featureMember
        for feature_member in root.findall('.//gml:featureMember', namespaces):
            feature = feature_member.find('.//cite:mct2_v_afectacions_data', namespaces)
            
            if feature is not None:
                incidencia = {}
                
                # Extraer campos básicos
                campos = {
                    'identificador': 'int',
                    'tipus': 'int',
                    'subtipus': 'int',
                    'carretera': 'str',
                    'pk_inici': 'float',
                    'pk_fi': 'float',
                    'causa': 'str',
                    'data': 'str',
                    'nivell': 'int',
                    'sentit': 'str',
                    'descripcio': 'str',
                    'descripcio_tipus': 'str',
                    'font': 'str',
                    'cap_a': 'str'
                }
                
                for campo, tipo in campos.items():
                    elem = feature.find(f'cite:{campo}', namespaces)
                    if elem is not None and elem.text:
                        valor = elem.text.strip()
                        # Convertir tipo si es necesario
                        if tipo == 'int':
                            try:
                                incidencia[campo] = int(valor)
                            except ValueError:
                                incidencia[campo] = valor
                        elif tipo == 'float':
                            try:
                                incidencia[campo] = float(valor)
                            except ValueError:
                                incidencia[campo] = valor
                        else:
                            incidencia[campo] = valor
                
                # Extraer coordenadas
                coords = feature.find('.//gml:coordinates', namespaces)
                if coords is not None and coords.text:
                    try:
                        lon, lat = coords.text.strip().split(',')
                        incidencia['longitud'] = float(lon)
                        incidencia['latitud'] = float(lat)
                    except:
                        pass
                
                incidencias.append(incidencia)
        
        print(f"✓ {len(incidencias)} incidencias extraídas")
        return incidencias
    
    except etree.XMLSyntaxError as e:
        print(f"✗ Error parseando XML: {str(e)}")
        raise

def mostrar_estadisticas(incidencias: List[Dict]) -> None:
    """Muestra estadísticas sobre las incidencias"""
    print("\n" + "=" * 80)
    print("ESTADÍSTICAS DE INCIDENCIAS")
    print("=" * 80)
    
    print(f"\nTotal de incidencias: {len(incidencias)}")
    
    # Tipos de incidencias
    tipos = {}
    for inc in incidencias:
        tipo = inc.get('tipus', 'desconocido')
        tipos[tipo] = tipos.get(tipo, 0) + 1
    
    print("\nIncidencias por tipo:")
    for tipo, cantidad in sorted(tipos.items()):
        print(f"  Tipo {tipo}: {cantidad}")
    
    # Causas
    causas = {}
    for inc in incidencias:
        causa = inc.get('causa', 'desconocida')
        causas[causa] = causas.get(causa, 0) + 1
    
    print("\nIncidencias por causa (Top 10):")
    for causa, cantidad in sorted(causas.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {causa}: {cantidad}")
    
    # Carreteras afectadas
    carreteras = {}
    for inc in incidencias:
        carretera = inc.get('carretera', 'desconocida')
        carreteras[carretera] = carreteras.get(carretera, 0) + 1
    
    print("\nCarreteras más afectadas (Top 10):")
    for carretera, cantidad in sorted(carreteras.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {carretera}: {cantidad}")
    
    # Niveles de severidad
    niveles = {}
    for inc in incidencias:
        nivel = inc.get('nivell', 'desconocido')
        niveles[nivel] = niveles.get(nivel, 0) + 1
    
    print("\nIncidencias por nivel de severidad:")
    for nivel, cantidad in sorted(niveles.items()):
        print(f"  Nivel {nivel}: {cantidad}")

def main():
    print("=" * 80)
    print("ANÁLISIS AVANZADO - Dataset 1: SCT Incidències Viàries")
    print("=" * 80 + "\n")
    
    try:
        # Descargar XML
        xml_content = descargar_xml(DATASET_URL)
        
        # Extraer incidencias
        incidencias = extraer_incidencias(xml_content)
        
        # Mostrar estadísticas
        mostrar_estadisticas(incidencias)
        
        # Guardar datos en JSON
        json_file = "dataset_1_incidencias.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(incidencias, f, ensure_ascii=False, indent=2)
        print(f"\n✓ Datos guardados en JSON: {json_file}")
        
        # Guardar datos en CSV simple
        csv_file = "dataset_1_incidencias.csv"
        if incidencias:
            import csv
            # Obtener todos los campos posibles
            todos_campos = set()
            for inc in incidencias:
                todos_campos.update(inc.keys())
            
            with open(csv_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=sorted(todos_campos))
                writer.writeheader()
                writer.writerows(incidencias)
            print(f"✓ Datos guardados en CSV: {csv_file}")
        
        # Mostrar ejemplo de una incidencia
        print("\n" + "=" * 80)
        print("EJEMPLO DE INCIDENCIA (Primera)")
        print("=" * 80)
        if incidencias:
            print(json.dumps(incidencias[0], ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(f"\n✗ Error en el proceso: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
