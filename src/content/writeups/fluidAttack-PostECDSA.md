---
title: "PostECDSA"
description: 'El reto expone un servicio remoto que genera una única firma ECDSA sobre un mensaje conocido y muestra la flag cifrada con AES.'
pubDate: 'Jan 25 2026'
heroImage: ''
ctf: 'Fluid Attack 2026'
---

* **Nombre:** PostECDSA
* **Categoría:** Crypto
* **Dificultad:** Easy
* **Puntaje:** 285

---

## Descripción

El reto expone un servicio remoto que genera una única firma ECDSA sobre un mensaje conocido y muestra la flag cifrada con AES. No existe interacción adicional con el servidor ni posibilidad de solicitar más firmas. El objetivo es recuperar la flag explotando una debilidad criptográfica en la implementación de ECDSA.

---

## Análisis del Código Proporcionado

El servidor genera una clave privada ECDSA `d` y firma el mensaje fijo:

```python
sig = ecdsa_sign('Stay at home kiddo !', privkey)
```

Posteriormente, la flag se cifra usando AES en modo ECB con una clave derivada directamente de la clave privada:

```python
key = sha256(str(d).encode()).digest()[:16]
```

El punto crítico se encuentra en la generación del nonce dentro del proceso de firma:

```python
nonce = ((h // 2**128) * 2**128) + d
```

Donde:

* `h` es el hash SHA-256 del mensaje.
* `d` es la clave privada ECDSA.

Esto implica que el nonce depende directamente de la clave privada.

---

## Vulnerabilidad

La seguridad de ECDSA depende completamente de que el nonce `k` sea impredecible e independiente de la clave privada. En este caso:

```
k = A + d
```

donde:

```
A = (h // 2^128) * 2^128
```

Dado que:

* el mensaje es conocido,
* el hash `h` es conocido,
* `A` puede calcularse,

el nonce filtra información lineal sobre la clave privada.

Este error invalida completamente la seguridad de ECDSA y permite recuperar la clave privada usando una sola firma.

---

## Explotación Matemática

Las ecuaciones fundamentales de ECDSA son:

```
r = (kG).x mod q
s = k⁻¹ (h + r·d) mod q
```

Sustituyendo `k = A + d`:

```
s(A + d) = h + r·d   (mod q)
```

Desarrollando:

```
sA + s·d = h + r·d
```

Agrupando términos con `d`:

```
d(s − r) = h − sA
```

Despejando la clave privada:

```
d = (h − sA) · (s − r)⁻¹ mod q
```

Todos los valores del lado derecho son conocidos, por lo que la clave privada puede recuperarse directamente.

---

## Recuperación de la Clave Privada

A partir de la salida del servidor se obtienen:

* el mensaje `msg`,
* los valores de la firma `r` y `s`,
* el orden de la curva `q`.

Pasos:

1. Calcular `h = SHA256(msg)`.
2. Calcular `A`.
3. Calcular el inverso modular de `(s − r)`.
4. Recuperar la clave privada `d`.

---

## Descifrado de la Flag

Una vez recuperada la clave privada `d`, se deriva la clave AES exactamente como en el servidor:

```python
key = sha256(str(d).encode()).digest()[:16]
```

La flag se descifra usando AES en modo ECB y se elimina el padding PKCS#7, obteniendo el texto plano.

---

## Script de Explotación

```python
from pwn import *
import json
from hashlib import sha256
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
from Crypto.Util.number import inverse
from ecdsa.ecdsa import generator_256

HOST = "3ae0cd25013a53f6.chal.ctf.ae"
PORT = 443

io = remote(host=HOST, port=PORT, ssl=True, sni=HOST)

data = io.recvall(timeout=5).decode()

sig_line = None
enc_flag = None

for line in data.splitlines():
    if line.startswith("sig ="):
        sig_line = line.replace("sig = ", "").strip()
    if line.startswith("enc_flag ="):
        enc_flag = line.replace("enc_flag = ", "").strip().strip("'")

sig = json.loads(sig_line.strip("'"))

G = generator_256
q = G.order()

msg = sig["msg"]
r = int(sig["r"])
s = int(sig["s"])

h = int(sha256(msg.encode()).hexdigest(), 16)
A = (h // 2**128) * 2**128

d = ((h - s * A) * inverse(s - r, q)) % q

key = sha256(str(d).encode()).digest()[:16]
aes = AES.new(key, AES.MODE_ECB)

flag = unpad(aes.decrypt(bytes.fromhex(enc_flag)), 16)
print(flag.decode())

io.close()
```

---

## Flag

```
flag{506f6c796d65726f5761734865726521}
```

---

## Conclusión

Este reto ilustra un error crítico en el uso de ECDSA: derivar el nonce a partir de la clave privada. Incluso una dependencia parcial entre el nonce y la clave privada es suficiente para comprometer completamente el esquema criptográfico.

La lección principal es clara: **ECDSA no tolera errores en la generación del nonce**. Una sola firma mal implementada puede llevar a la recuperación total de la clave privada y a la ruptura completa del sistema.
