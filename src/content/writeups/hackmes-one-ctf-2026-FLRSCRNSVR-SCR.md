---
title: "FLRSCRNSVR.SCR"
description: 'un archivo ejecutable (PE) de 64 bits para entornos Windows, diseñado para operar como un protector de pantalla. Superficialmente, el programa despliega gráficos en movimiento y reacciona a colisiones simuladas.'
pubDate: '2026-02-21'
heroImage: '../../assets/FLRSCRNSVR.SCR.png'
ctf: 'Cracksme.one ctf 2026'
---

# Writeup: FLRSCRNSVR.SCR - Análisis Estático y Criptografía Inversa

**Objetivo del Reto:** Extracción de flag ofuscada en binario ejecutable.
**Entorno y Herramientas:** Ghidra (Descompilación C/C++), Análisis Estático, Python.

---

## 1. Descripción del Reto

El artefacto analizado es `FLRSCRNSVR.SCR`, un archivo ejecutable (PE) de 64 bits para entornos Windows, diseñado para operar como un protector de pantalla. Superficialmente, el programa despliega gráficos en movimiento y reacciona a colisiones simuladas. Sin embargo, bajo la superficie, implementa un mecanismo de validación criptográfica condicionado por consultas al Registro de Windows y contadores de tiempo de ejecución.

El objetivo principal de este análisis es evitar la interacción dinámica (parcheo de contadores o manipulación del registro) y proceder a la extracción directa de la "flag" mediante el aislamiento y la reversión algorítmica de sus rutinas de cifrado internas.

---

## 2. Fase de Descubrimiento: Localización del Ciphertext

El primer paso en el análisis estático consistió en identificar los datos cifrados (ciphertext) que el programa oculta. La trazabilidad condujo a la función identificada por Ghidra como **`FUN_140001890`**.

Esta función intenta recuperar un valor del registro (`HKEY_CURRENT_USER\Software\FLRSCRNSVR\Quak`). Cuando el programa se ejecuta en un entorno limpio sin esta clave, la ejecución cae en un bloque `else` que carga una cadena de bytes constante en la memoria mediante `wcscpy_s`.

**Extracto del código descompilado (`FUN_140001890`):**

```c
else {
  wcscpy_s(param_1,0x100,L"<Qj\t\x02\a%\x030\b\x04)h$\x01$\x18kw\x0fp6\x02\x0e\v");
}

```

*Conclusión de Fase 1:* Esta constante de 25 bytes representa el estado final esperado por el programa. Para propósitos de ingeniería inversa, este es nuestro ciphertext objetivo.

---

## 3. Desmontando el Algoritmo de Transformación

La rutina encargada de procesar los datos fue localizada en la función **`FUN_140001300`**. Este bloque de código está fuertemente ofuscado mediante llamadas innecesarias a la API de Windows (`GetTickCount`, `GetDesktopWindow`, etc.) insertadas como código basura.

Al aislar la lógica matemática, se revelaron tres etapas criptográficas distintas.

### Etapa 3.1: Construcción de la Clave (Stack Strings)

Para evitar que la clave de cifrado sea visible mediante análisis de cadenas estáticas (como el comando `strings`), el autor utilizó la técnica de *Stack Strings*, construyendo la clave byte a byte en un arreglo local (`local_688`).

**Extracción desde el código (`FUN_140001300`):**

```c
local_688[0] = 0x46; // 'F'
local_688[1] = 0x4c; // 'L'
// ... llamadas a APIs omitidas ...
local_688[2] = 0x41; // 'A'
local_688[3] = 0x52; // 'R'
local_688[4] = 0x45; // 'E'
local_688[5] = 0x52; // 'R'
local_688[6] = 0x41; // 'A'
local_688[7] = 0x4c; // 'L'
local_688[8] = 0x46; // 'F'
local_688[9] = 0;    // Null terminator

```

*Clave recuperada:* `FLARERALF`

### Etapa 3.2: Tablas de Sustitución Estática

El algoritmo define dos alfabetos de 65 caracteres para realizar una sustitución uno a uno.

**Extracción desde el código (`FUN_140001300`):**

* **Alfabeto Base (`local_388`):** Formado concatenando cadenas estáticas.
`abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789}_{=-`
* **Alfabeto Destino (`local_2e8`):** Su contraparte ofuscada.
`-={_}9876543210ZYXWVUTSRQPONMLKJIHGFEDCBAzyxwvutsrqponmlkjihgfedcba`

La rutina original busca un carácter en el Alfabeto Base y lo reemplaza por el carácter en el mismo índice dentro del Alfabeto Destino.

### Etapa 3.3: Cifrado XOR Indexado e Inversión

Tras la sustitución, el código aplica un bucle que realiza una operación XOR posicional y, finalmente, invierte el orden completo de la cadena.

**Extracción del XOR (`FUN_140001300`):**

```c
*puVar1 = *puVar1 ^ (short)uVar15 + local_688[uVar15 % uVar19];

```

*Lógica:* `carácter ^ (índice + clave_en_índice)`

**Extracción de Inversión (`FUN_140001300`):**
El bloque condicional `if (uVar20 >> 1 != 0)` itera hasta la mitad de la longitud del buffer, intercambiando punteros simétricamente (`*param_1` con `*puVar16`), lo que resulta en un *reverse* clásico.

---

## 4. Desarrollo del Decryptor (Python)

Con todos los componentes algorítmicos identificados, la obtención de la flag se reduce a aplicar el proceso inverso estricto sobre el ciphertext localizado en la Fase 1.

**Lógica de Reversión:**

1. **Invertir:** Restablecer el orden original invirtiendo el arreglo de bytes.
2. **XOR Simétrico:** Aplicar la misma fórmula matemática original.
3. **Sustitución Inversa:** Mapear los caracteres desde el Alfabeto Destino de vuelta al Alfabeto Base.

**Script de Implementación:**

```python
def extract_flag():
    # 1. Ciphertext extraído de FUN_140001890
    ciphertext = [
        0x3c, 0x51, 0x6a, 0x09, 0x02, 0x07, 0x25, 0x03, 
        0x30, 0x08, 0x04, 0x29, 0x68, 0x24, 0x01, 0x24, 
        0x18, 0x6b, 0x77, 0x0f, 0x70, 0x36, 0x02, 0x0e, 0x0b
    ]

    # 2. Alfabetos extraídos de FUN_140001300
    alpha_base = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789}_{=-"
    alpha_dest = "-={_}9876543210ZYXWVUTSRQPONMLKJIHGFEDCBAzyxwvutsrqponmlkjihgfedcba"
    
    # 3. Clave extraída de la pila (Stack Strings) en FUN_140001300
    key = [ord(c) for c in "FLARERALF"]

    # Paso 1: Inversión de Cadena
    ciphertext = ciphertext[::-1]
    
    # Paso 2: XOR Indexado
    xor_output = []
    for i in range(len(ciphertext)):
        k = key[i % len(key)]
        decrypted_val = ciphertext[i] ^ (i + k)
        xor_output.append(decrypted_val)

    # Paso 3: Mapeo de Sustitución Inversa
    plaintext = ""
    for val in xor_output:
        char_dest = chr(val)
        if char_dest in alpha_dest:
            idx = alpha_dest.index(char_dest)
            plaintext += alpha_base[idx]
        else:
            plaintext += "?"

    return plaintext

if __name__ == "__main__":
    print(f"Flag recuperada: {extract_flag()}")

```

---

## 5. Conclusión y Resultados

El uso del análisis estático permitió eludir completamente las validaciones temporales (contador de colisiones) y las dependencias del sistema operativo (claves de registro). Al identificar las constantes de cifrado y replicar la lógica aritmética a la inversa, se expuso la cadena de texto plano.

**Flag Obtenida:**
`CMO{frogt4s7ic_r3vers1ng}`