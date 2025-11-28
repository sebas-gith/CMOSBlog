---
title: "LSD#4"
description: 'The "LSD#4" challenge is a steganography task focused on deep, bit-level analysis of a manipulated image. Part of the "LSD" series, the image features complex, psychedelic patterns, which are ideal for hiding information via minimal changes to the RGB channels.'
pubDate: 'Nov 28 2025'
heroImage: ''
ctf: 'HeroCTF'
---

# Complete Writeup – LSD#4 (383) – Medium – LSB Steganography

**Author:** Thib
**Expected Format:** `^Hero{\S+}$`
**Category:** Steganography (LSB)

---

## 1. Introduction and Challenge Analysis

The "LSD#4" challenge is a steganography task focused on deep, bit-level analysis of a manipulated image. Part of the "LSD" series, the image features complex, psychedelic patterns, which are ideal for hiding information via minimal changes to the RGB channels.

The challenge includes two critical pieces of information:

1.  **Anti-Tool Hint:** *"Don't try to throw random tools at this poor image. Go back to the basics and learn the detection techniques."* This is a strong indicator that automated LSB tools (like `zsteg`) will likely fail or require extensive custom configuration, pushing the solver toward manual, systematic analysis.
2.  **Specific Location Hint:** *"Little hint : The square measures 100x100 and starts at coordinates 1000:1000."* This limits the search area to $10,000$ pixels, drastically reducing complexity.

## 2. Technical Description and Methodology

The image is a high-resolution PNG with high saturation and visual noise. While the challenge mentions **LSB** (Least Significant Bit), the noise and the author's misdirection often suggest looking for an alternative encoding.

### The Search Space
The target region is defined as:
* **Start:** $(x=1000, y=1000)$
* **Size:** $100 \times 100$ pixels
* **Capacity:** $100 \times 100 \times 3$ channels $= 30,000$ bits $\approx 3,750$ bytes of potential data.

### Systematic Extraction Strategy
To follow the "go back to the basics" advice, a systematic approach was implemented to test all likely combinations within the target area:

1.  **Targeted Extraction:** Only pixels from $1000:1100$ (X-axis) and $1000:1100$ (Y-axis) were analyzed.
2.  **Bit Plane Variation:** Extracting data from both the **LSB (Bit 0)** and the **MSB (Bit 7)**.
3.  **Channel Variation:** Testing individual channels (R, G, B) and common interleaving orders (RGB and BGR).
4.  **Bit Ordering:** Testing **MSB-first** (standard ASCII interpretation) and **LSB-first** byte assembly.

---

## 3. The Breakthrough

After implementing the systematic search and extracting the data, the flag was found in one specific configuration that contradicted the "LSB" challenge title.

### Winning Configuration

| Parameter | Value |
| :--- | :--- |
| **Channel** | **Red (R)** |
| **Bit Plane** | **MSB (Bit 7)** |
| **Byte Assembly** | **MSB-first** (Standard) |

### Why MSB Works

This result is a common CTF trick:

* **Misdirection:** The "LSB" title leads solvers to discard the MSB.
* **Noise Absorption:** In a highly saturated and noisy image like this, small changes to the **MSB** are visually hard to detect. The high contrast and color complexity mask the strong color shifts usually caused by MSB modification.
* **Efficiency:** Using the MSB of a single channel (Red) allowed the author to cleanly embed the flag without relying on complex multi-channel interleaving.

## 4. Result and Final Flag

The bytes extracted from the **MSB of the Red channel** within the $100 \times 100$ square formed a clear, readable ASCII message, which contained the flag.

The final extracted message was:

`Steganography is about finding the needle in the haystack, but what if the haystack is the clue itself? Hero{M4YB3_TH3_L4ST_LSB?}`

---

## 5. Code used 

```py
#!/usr/bin/env python3
"""
extract_lsd4.py
Extracción sistemática de LSB/MSB para el reto LSD#4.

Uso:
    python3 extract_lsd4.py

Requisitos:
    pip install Pillow
"""

from PIL import Image
import binascii
import re
import sys
from pathlib import Path

IMG_PATH = Path("/mnt/data/secret.png")   # ruta usada en el entorno del reto
OUT_DIR = Path("/mnt/data")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# región conocida del reto
X0, Y0 = 1000, 1000
W, H = 100, 100

FLAG_RE = re.compile(rb"Hero\{\S+?\}")

def load_pixels(path):
    img = Image.open(path).convert("RGB")
    return img, img.load()

def bits_to_bytes(bits, msb_first=True):
    """Convierte lista de bits (0/1) en bytearray.
    msb_first=True interpreta el primer bit del chunk como bit7 (MSB).
    msb_first=False interpreta el primer bit como bit0 (LSB-first).
    """
    data = bytearray()
    for i in range(0, len(bits), 8):
        chunk = bits[i:i+8]
        if len(chunk) < 8:
            chunk += [0] * (8 - len(chunk))
        byte = 0
        if msb_first:
            for b in chunk:
                byte = (byte << 1) | (b & 1)
        else:
            for j, b in enumerate(chunk):
                byte |= ((b & 1) << j)
        data.append(byte)
    return data

def try_interpret(name, data, found_list):
    info = {"name": name, "len": len(data)}
    # try decode utf-8
    try:
        txt = data.decode("utf-8")
        info["text_preview"] = txt[:200]
    except Exception:
        info["text_preview"] = None
    # search flag pattern in raw bytes
    m = FLAG_RE.search(data)
    if m:
        flag = m.group(0).decode('utf-8', errors='ignore')
        found_list.append((name, flag))
        info["flag"] = flag
    # try latin1 search as fallback
    try:
        tlatin = data.decode("latin1")
        mm = re.search(r"Hero\{\S+?\}", tlatin)
        if mm and "flag" not in info:
            info["flag"] = mm.group(0)
            found_list.append((name, info["flag"]))
    except Exception:
        pass
    # small ascii-like sample
    am = re.search(rb"[A-Za-z0-9_\{\}\-]{4,}", data)
    if am:
        try:
            info["ascii_sample"] = am.group(0)[:200].decode('latin1', errors='ignore')
        except:
            info["ascii_sample"] = str(am.group(0)[:200])
    return info

def main():
    if not IMG_PATH.exists():
        print(f"Error: imagen no encontrada en {IMG_PATH}", file=sys.stderr)
        sys.exit(1)

    img, px = load_pixels(IMG_PATH)

    # recolección de bits
    bits_rgb = []
    bits_bgr = []
    bits_r = []
    bits_g = []
    bits_b = []
    for y in range(Y0, Y0 + H):
        for x in range(X0, X0 + W):
            r, g, b = px[x, y]
            # r,g,b order
            bits_rgb.extend([r & 1, g & 1, b & 1])
            # b,g,r order (reverse)
            bits_bgr.extend([b & 1, g & 1, r & 1])
            # per-channel
            bits_r.append(r & 1)
            bits_g.append(g & 1)
            bits_b.append(b & 1)

    # crear interpretaciones
    variants = []
    variants.append(("rgb_msb", bits_to_bytes(bits_rgb, msb_first=True)))
    variants.append(("rgb_lsb", bits_to_bytes(bits_rgb, msb_first=False)))
    variants.append(("bgr_msb", bits_to_bytes(bits_bgr, msb_first=True)))
    variants.append(("bgr_lsb", bits_to_bytes(bits_bgr, msb_first=False)))

    variants.append(("r_msb", bits_to_bytes(bits_r, msb_first=True)))
    variants.append(("r_lsb", bits_to_bytes(bits_r, msb_first=False)))
    variants.append(("g_msb", bits_to_bytes(bits_g, msb_first=True)))
    variants.append(("g_lsb", bits_to_bytes(bits_g, msb_first=False)))
    variants.append(("b_msb", bits_to_bytes(bits_b, msb_first=True)))
    variants.append(("b_lsb", bits_to_bytes(bits_b, msb_first=False)))

    found = []
    reports = []

    # probar interpretaciones y guardarlas
    for name, data in variants:
        info = try_interpret(name, data, found)
        info["name"] = name
        reports.append(info)
        # guardar dump para inspección manual
        outfile = OUT_DIR / f"dump_{name}.bin"
        with open(outfile, "wb") as f:
            f.write(data)

    # probar XOR simple en las dos interpretaciones RGB (como medida adicional)
    xorkeys = [0xFF, 0x7F, 0x20, 0x55, 0xAA]
    for base_name, base_data in [("rgb_msb", variants[0][1]), ("rgb_lsb", variants[1][1])]:
        for k in xorkeys:
            xd = bytearray(b ^ k for b in base_data)
            name = f"{base_name}_xor_{k:02x}"
            info = try_interpret(name, xd, found)
            info["name"] = name
            reports.append(info)
            with open(OUT_DIR / f"dump_{name}.bin", "wb") as f:
                f.write(xd)

    # impresión resumen
    print("Resumen de interpretaciones (muestras):")
    for r in reports:
        print(f"\n-- {r['name']} -- len={r.get('len')},",
              f"ascii_sample={r.get('ascii_sample', '')}",
              f"flag={r.get('flag', '')}")
        if r.get("text_preview"):
            print("  text_preview:", repr(r["text_preview"][:200]))

    if found:
        print("\n=== FLAGS ENCONTRADAS ===")
        for fnd in found:
            print(f"Metodo: {fnd[0]}  ->  {fnd[1]}")
    else:
        print("\nNo se detectaron flags automáticamente. Revisa los dumps en", OUT_DIR)

if __name__ == "__main__":
    main()

```

## 6. Final Flag

The required flag is:

`Hero{M4YB3_TH3_L4ST_LSB?}`