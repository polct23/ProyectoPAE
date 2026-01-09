from datasets import extraer_coordenadas_con_detalles

# Obtener todas las incidencias
incidencias = extraer_coordenadas_con_detalles()

# Extraer tipos únicos
tipos_descripcion = set()
tipos_tipo = set()
causas = set()
descripciones = set()

for inc in incidencias:
    if inc.get('tipo'):
        tipos_tipo.add(inc['tipo'])
    if inc.get('descripcion'):
        descripciones.add(inc['descripcion'])
    if inc.get('causa'):
        causas.add(inc['causa'])

print("=" * 60)
print("TIPOS DE INCIDENCIAS ENCONTRADAS")
print("=" * 60)

print("\n📋 TIPOS (descripcio_tipus):")
for tipo in sorted(tipos_tipo):
    print(f"  - {tipo}")

print("\n📝 DESCRIPCIONES (descripcio):")
for desc in sorted(descripciones):
    print(f"  - {desc}")

print("\n🔧 CAUSAS (causa):")
for causa in sorted(causas):
    print(f"  - {causa}")

print(f"\n📊 TOTAL: {len(incidencias)} incidències")
print(f"   {len(tipos_tipo)} tipus diferents")
print(f"   {len(descripciones)} descripcions diferents")
print(f"   {len(causas)} causes diferents")
