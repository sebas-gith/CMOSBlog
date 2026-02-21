---
title: "CryptPad"
description: 'Existe una regla de oro en el mundo de la ciberseguridad: “Nunca escribas tu propia criptografía”.'
pubDate: '2026-02-21'
heroImage: '../../assets/CryptPad.png'
ctf: 'Cracksme.one ctf 2026'
---

# Autopsia de CryptPad: Cuando el malware te regala las llaves

Existe una regla de oro en el mundo de la ciberseguridad: "Nunca escribas tu propia criptografía". El reto CryptPad es un recordatorio perfecto de por qué esta regla existe. Nos enfrentamos a un ejecutable de Windows de 32 bits que simula ser un bloc de notas ultra seguro. Cifra nuestros archivos, sí, pero comete el pecado capital del manejo de claves.

---

### Fase 1: Ingeniería Inversa y Reconocimiento

Al cargar el binario en nuestro desensamblador (IDA/Ghidra), vemos una aplicación estándar de Win32. Rastreando las llamadas a la API, llegamos rápidamente al corazón del programa: la función de guardado desencadenada por el evento de menú `0x67`.

El flujo de ejecución nos lleva a la subrutina de cifrado (identificada en `0x4013bd`). Aquí es donde las cosas se ponen interesantes. El programa no utiliza una librería estándar de Windows como CryptoAPI para su cifrado principal. En su lugar, hace lo siguiente:

1. Llama a `SystemFunction036` (conocida como `RtlGenRandom`) para generar una semilla de 8 bytes. Esta es nuestra clave maestra.
2. Pasa esta clave y el texto plano a una función de transformación (`0x4014eb`).

Al inspeccionar los bucles anidados en `0x4014eb`, el patrón es inconfundible. Vemos la inicialización de un array de 256 bytes (S-Box), intercambios de variables y una operación XOR byte a byte. No es un cifrado alienígena; es una implementación de manual del algoritmo de flujo **RC4**.

Hasta aquí, todo parece robusto. Romper RC4 a la fuerza bruta sin vulnerabilidades conocidas en la implementación llevaría una eternidad. Pero la falla no está en el algoritmo, sino en cómo el programa maneja el archivo resultante.

### Fase 2: La Anatomía del Desastre (El Footer)

La verdadera vulnerabilidad se revela justo antes de que el programa llame a `WriteFile`. Observamos cómo se construye el archivo en memoria. El desarrollador decidió que la forma más fácil de saber cómo descifrar el archivo en el futuro era... guardar la clave en el propio archivo.

Cerca de la dirección `0x401645`, el ensamblador muestra instrucciones que calculan punteros hacia el final del buffer de datos.

La estructura del archivo cifrado termina viéndose exactamente así:

* **[Datos Cifrados]**: El payload original procesado con RC4.
* **[Padding]**: Bytes basura para rellenar.
* **[Tamaño]**: 4 bytes (Little Endian) indicando el tamaño del texto original, ubicados a 13 bytes del final (`EOF - 13`).
* **[Clave RC4]**: Los 8 bytes generados aleatoriamente, empaquetados directamente en el archivo a 9 bytes del final (`EOF - 9`).
* **[Basura]**: 1 byte final.

El "malware" literalmente empaca la cerradura y la llave en la misma caja.

### Fase 3: Explotación y Recuperación

Con el mapa del tesoro en nuestras manos, no necesitamos reversing dinámico ni debuggers. Solo necesitamos un script que lea el final del archivo, extraiga la clave, extraiga el tamaño y aplique el mismo RC4 a la inversa.

Desarrollamos la siguiente herramienta para automatizar el rescate:

```python
import sys
import struct

def ksa(key):
    """Key Scheduling Algorithm para inicializar el S-Box"""
    sched = list(range(256))
    j = 0
    for i in range(256):
        j = (j + sched[i] + key[i % len(key)]) % 256
        sched[i], sched[j] = sched[j], sched[i]
    return sched

def prga(sched):
    """Pseudo-Random Generation Algorithm para el keystream"""
    i = 0
    j = 0
    while True:
        i = (i + 1) % 256
        j = (j + sched[i]) % 256
        sched[i], sched[j] = sched[j], sched[i]
        yield sched[(sched[i] + sched[j]) % 256]

def rc4_decrypt(data, key):
    """Desencriptado de flujo RC4"""
    sched = ksa(key)
    keystream = prga(sched)
    res = bytearray(data)
    for i in range(len(data)):
        res[i] ^= next(keystream)
    return res

def solve(filepath):
    with open(filepath, 'rb') as f:
        data = f.read()

    total_len = len(data)
    
    # El talón de Aquiles: La clave en texto plano
    key = data[total_len - 9 : total_len - 1]
    
    # El tamaño original para descartar el padding
    size_bytes = data[total_len - 13 : total_len - 9]
    original_size = struct.unpack('<I', size_bytes)[0]
    
    print(f"[*] Extrayendo clave maestra: {key.hex()}")
    print(f"[*] Tamaño del payload original: {original_size} bytes")

    # Extraemos solo la porción de datos y desciframos
    encrypted_payload = data[:original_size]
    plaintext = rc4_decrypt(encrypted_payload, key)
    
    print("\n[+] Misión Cumplida. Archivo descifrado:")
    print(plaintext.decode('utf-8', errors='ignore'))

if __name__ == "__main__":
    solve(sys.argv[1])

```

### El Botín

Lanzamos nuestro script contra el archivo objetivo `flag.enc` proporcionado por el reto. El script localiza silenciosamente el footer, extrae la semilla `e8171bf4503f3d70`, y revierte el cifrado en milisegundos.

La consola escupe el resultado final, revelando un mensaje que sirve como moraleja perfecta para el creador de la aplicación:

**Flag:** `CMO{r0ll_y0ur_0wn_b4d_c0d3}`

El código es ley, pero el mal código es una puerta trasera abierta de par en par. Reto superado.