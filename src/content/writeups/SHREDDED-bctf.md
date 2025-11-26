---
title: 'Writeup SHREDED bctf'
description: 'Reconstruimos exitosamente una imagen PNG a partir del archivo `document.png.shredded` que había sido fragmentado y mezclado mediante el programa `shredder.c'
pubDate: 'Nov 25 2025'
heroImage: ''
ctf: 'Backery ctf'
---



## 📋 Executive Summary

**Objetivo Cumplido**: Reconstruimos exitosamente una imagen PNG a partir del archivo `document.png.shredded` que había sido fragmentado y mezclado mediante el programa `shredder.c`.

**Resultado**: Generamos `recovered_valid.png` - un archivo PNG válido con todos los CRCs correctos y estructura intacta, permitiendo visualizar la flag del CTF.

**Técnica Principal**: Implementamos una búsqueda ordenada de fragmentos con poda algorítmica mediante validación de CRC de chunks PNG, reduciendo drásticamente el espacio de búsqueda de 36! a un problema computacionalmente manejable.

---

## 🎯 Objetivos

- ✅ Recuperar la imagen original desde `document.png.shredded`
    
- ✅ Desarrollar y documentar un método reproducible (PoC) para reconstrucción
    
- ✅ Extraer la flag y proporcionar pasos completos para replicación
    

---

## 📁 Archivos Entregados / Materiales

**Artefactos proporcionados**:

- `shredder.c` - código fuente del programa de fragmentación
    
- `document.png.shredded` - archivo resultante del proceso de shredding
    


## 🔍 Análisis Preliminar

### 6.1 Inspección de `shredder.c`

**Funcionamiento clave identificado**:

```c

// Parámetros críticos
int n = 36;  // Número de fragmentos
chunk_size = (filesize + n - 1) / n;  // División entera hacia arriba

// Algoritmo de mezcla Fisher-Yates
srand(time(NULL));  // Semilla basada en tiempo
for (int i = n-1; i > 0; i--) {
    int j = rand() % (i + 1);
    // Intercambio de índices
}

```
**Conclusión**: La reconstrucción requiere determinar `n` y descubrir la permutación original de los bloques.

### 6.2 Inspección de `.shredded`

**Características del archivo**:

- Tamaño total: **377,100 bytes**
    
- Sin cabecera PNG válida al inicio (evidencia de mezcla)
    

**Búsqueda de firma PNG** (`\x89PNG\r\n\x1a\n`):

- Probamos múltiples valores de `n`
    
- **Candidatos identificados**: n=12, n=36, n=60
    
- **Seleccionado n=36**: Produce chunks de tamaño plausible (10,475 bytes) y contiene fragmento con cabecera PNG en posición 21
    

---

## 🧩 Estrategia de Recuperación

### Alternativas Consideradas

|Enfoque|Viabilidad|Complejidad|
|---|---|---|
|Bruteforce de semillas `rand()`|✅ Limitada|O(2³²)|
|Bruteforce combinatorio|❌ Imposible|O(36! ≈ 10⁴¹)|
|**Poda por contenido (CRC)**|✅ **Óptima**|O(n! con poda agresiva)|

### Justificación de la Estrategia Seleccionada

**Ventajas de validación por CRC**:

- Cada chunk PNG contiene CRC interno calculado sobre `[tipo + datos]`
    
- Cualquier orden incorrecto que produzca chunks PNG completos con CRC inválida se descarta inmediatamente
    
- La validación incremental reduce espacio de búsqueda en órdenes de magnitud
    

---

## ⚙️ Algoritmo de Reconstrucción

### Diagrama de Flujo

### Implementación de Alto Nivel

1. **División en fragmentos**: `document.png.shredded` → 36 chunks de 10,475 bytes
    
2. **Identificación inicial**: Fragmento 21 contiene cabecera PNG
    
3. **Búsqueda con poda**:
    
    - Concatenar chunks candidatos secuencialmente
        
    - Validar CRCs de chunks PNG completos incrementalmente
        
    - Podar ramas con CRC inválido inmediatamente
        
4. **Terminación**: Detectar chunk `IEND` con todos los CRCs válidos
    

---

## 🚀 PoC - Código de Reconstrucción


```python
#!/usr/bin/env python3
"""
Reconstructor de PNG Shreddeado - PoC Completo
Uso: python3 reconstruct_png_from_shredded.py
"""

import struct
import zlib
import time

# Configuración
SHRED_PATH = "document.png.shredded"
OUT_PATH = "recovered_valid.png"
PNG_SIG = b'\x89PNG\r\n\x1a\n'

def parse_progress(buf):
    """
    Valida progreso de reconstrucción verificando chunks PNG completos
    Retorna: (éxito, estado, posición)
    """
    if not buf.startswith(PNG_SIG):
        return False, "no_sig", 0
    
    pos = len(PNG_SIG)
    buflen = len(buf)
    
    while True:
        # Verificar si tenemos datos suficientes para leer longitud
        if pos + 8 > buflen:
            return True, None, pos
            
        # Leer longitud y tipo del chunk
        length = struct.unpack(">I", buf[pos:pos+4])[0]
        ctype = buf[pos+4:pos+8]
        chunk_total = 4 + 4 + length + 4  # length + type + data + crc
        
        # Verificar chunk completo
        if pos + chunk_total > buflen:
            return True, None, pos
            
        # Extraer datos y CRC
        data_start = pos + 8
        data_end = data_start + length
        crc_actual = struct.unpack(">I", buf[data_end:data_end+4])[0]
        
        # Calcular CRC
        crc_calc = zlib.crc32(buf[pos+4:data_end]) & 0xffffffff
        
        # Validar
        if crc_actual != crc_calc:
            return False, f"crc_mismatch {ctype!r}", pos
            
        pos += chunk_total
        
        # Terminar si encontramos IEND
        if ctype == b'IEND':
            return True, "done", pos

def detect_candidates(data, max_n=100):
    """
    Detecta candidatos de n probando divisiones y buscando cabecera PNG
    """
    filesize = len(data)
    candidates = []
    
    for n in range(2, max_n + 1):
        chunk_size = (filesize + n - 1) // n
        chunks = [data[i * chunk_size:(i + 1) * chunk_size] for i in range(n)]
        
        # Buscar chunks que comiencen con firma PNG
        starts = [i for i, ch in enumerate(chunks) if ch.startswith(PNG_SIG)]
        
        if starts:
            candidates.append((n, chunk_size, starts))
            
    return candidates

def attempt_reconstruct(data, n, chunk_size, starts, step_limit=3_000_000):
    """
    Intenta reconstruir el archivo usando DFS con poda por CRC
    """
    chunks = [bytearray(data[i * chunk_size:(i + 1) * chunk_size]) for i in range(n)]
    visited = 0
    found_order = None
    start_time = time.time()
    
    def dfs(buf, used_mask, order):
        nonlocal visited, found_order
        
        visited += 1
        if visited % 100000 == 0:
            print(f"[+] Nodos visitados: {visited:,}, Tiempo: {time.time() - start_time:.1f}s")
        
        # Validar progreso actual
        ok, status, pos = parse_progress(buf)
        if not ok:
            return False
            
        # Verificar si terminamos
        if status == "done":
            found_order = order.copy()
            return True
        
        # Probar siguientes chunks
        for i in range(n):
            if used_mask & (1 << i):
                continue
                
            new_buf = buf + bytes(chunks[i])
            ok2, status2, pos2 = parse_progress(new_buf)
            
            if not ok2:
                continue
                
            if dfs(new_buf, used_mask | (1 << i), order + [i]):
                return True
                
            if visited > step_limit:
                return False
                
        return False
    
    # Intentar desde cada posible inicio
    for si in starts:
        print(f"[*] Probando inicio {si} para n={n}")
        if dfs(bytes(chunks[si]), 1 << si, [si]):
            break
            
    if found_order:
        # Reconstruir archivo final
        out_data = b"".join(chunks[i] for i in found_order)
        with open(OUT_PATH, "wb") as f:
            f.write(out_data)
        print(f"[+] Archivo reconstruido: {OUT_PATH}")
        return True, found_order
        
    print("[-] No se encontró orden válido dentro del límite")
    return False, None

def main():
    """Función principal"""
    print("[*] Cargando archivo shreddeado...")
    data = open(SHRED_PATH, "rb").read()
    print(f"[*] Tamaño del archivo: {len(data):,} bytes")
    
    # Detectar candidatos
    print("[*] Buscando candidatos de n...")
    candidates = detect_candidates(data, max_n=100)
    print(f"[*] Candidatos encontrados: {candidates}")
    
    # Intentar reconstrucción para cada candidato
    for n, chunk_size, starts in candidates:
        print(f"[*] Probando n={n}, chunk_size={chunk_size}, starts={starts}")
        success, order = attempt_reconstruct(data, n, chunk_size, starts)
        
        if success:
            print(f"[+] ¡Reconstrucción exitosa!")
            print(f"[+] Orden encontrado: {order}")
            return
    
    print("[-] Reconstrucción fallida para todos los candidatos")

if __name__ == "__main__":
    main()

```
### Instrucciones de Ejecución



# Ejecutar reconstrucción
python3 reconstruct_png_from_shredded.py

# Verificar resultado
file recovered_valid.png
sha256sum recovered_valid.png

---

## 📊 Resultados

### Reconstrucción Exitosa

- **Archivo generado**: `recovered_valid.png`
    
- **Validación**: PNG válido con todos los CRCs correctos
    
- **Chunk IEND**: Encontrado y validado
    

### Permutación Encontrada

text

[21, 24, 28, 0, 16, 34, 33, 8, 14, 25, 4, 19, 17, 3, 1, 32, 27, 6, 2,
 5, 12, 29, 26, 10, 15, 18, 22, 30, 7, 23, 31, 20, 35, 13, 11, 9]

### Flag Obtenida

**La flag fue visible al abrir la imagen reconstruida** (el contenido específico depende del reto particular).

---

## 🔎 Análisis Post-Mortem

### ¿Por qué Funcionó?

- El shredder preservó la **integridad interna** de los chunks PNG
    
- Los **CRCs permanecieron intactos**, proporcionando mecanismo de validación robusto
    
- La **estructura predecible** de PNG permitió validación incremental
    

### Riesgos Identificados

Si el shredder implementara:

- ✅ Modificación de CRCs → Reconstrucción imposible vía CRC
    
- ✅ Cifrado de datos → Requeriría clave
    
- ✅ Mezcla a nivel de bit → Destrucción irreversible
    

---

## 🛡️ Mitigaciones y Recomendaciones

### Para Destrucción Segura Real

1. **Sobrescritura múltiple** (algoritmos DoD 5220.22-M)
    
2. **Cifrado previo** con clave descartada
    
3. **Corrupción de metadatos** críticos
    
4. **Shredding a nivel de bit** en lugar de bloques
    

### Mejoras al Shredder Actual

```c
// Implementación más segura
void secure_shred(FILE *f) {
    // 1. Sobrescribir con datos aleatorios
    // 2. Cifrar con clave efímera  
    // 3. Fragmentar y mezclar
    // 4. Corromper cabeceras y CRCs
}
```

---

## 🏁 Conclusión

La técnica de **validación incremental por CRC** demostró ser extremadamente efectiva para reconstruir archivos PNG shreddeados cuando se preserva la integridad interna de los chunks. El PoC desarrollado es **reproducible y escalable**, sirviendo como base para:

- Evaluación de efectividad de métodos de shredding
    
- Recuperación forense de datos fragmentados
    
- Desarrollo de herramientas de análisis de seguridad
    

**Lección clave**: La destrucción segura requiere más que simple fragmentación y mezcla - debe incluir corrupción de mecanismos de validación y metadatos estructurales.

---

**Estado**: ✅ RECONSTRUCCIÓN EXITOSA  
**Flag**: ![Flag](../../assets/recovered_valid.png)
**Metodología**: VALIDACIÓN POR CRC CON PODA ALGORÍTMICA