---
title: "Alpha Channel"
description: "Las imágenes RGBA tienen 4 canales; todos miran el verde, el rojo y el azul, pero nadie mira el cuarto."
pubDate: "4-1-2026"
heroImage: "../../assets/s4vitarctf/steg//flag.png"
ctf: "s4vitarCTF1"
---

- **Dificultad:** *Difícil*
- **Categoría:** *Esteganografía*
- **Herramientas:** *(StegSolve, Python)*

### Descripción 

La descripción del reto dice exactamente lo que hay que hacer: ver el alpha de la imagen (la A de RGBA).

#### Vista general

![imagen reto](../../assets/s4vitarctf/steg/stego6.png)

#### Consiguiendo la flag

Como sabemos dónde buscar, simplemente hay que comenzar a buscar. Para ello, utilicé StegSolve, que me permite aplicar filtros de color e inspeccionar los planos de bits de la imagen.

Lo que hice para ver los alpha fue ir a *Analyse > Data Extract > Seleccionar all > Darle a preview*, y en el preview se puede ver la flag separada en el documento.

![stegsolve image](../../assets/s4vitarctf/steg/stesolveimagesolve.png)

Entonces guardé el preview como texto en **steg.txt**, y luego, con este comando, obtuve la flag:

```bash
strings steg.txt | grep -oP "[a-zA-Z0-9_%^&*(){}]+" | tr -d '\n' && echo
````

![comando flag](../../assets/s4vitarctf/steg/comando_flag.png)

### Flag

```sh
H4U{4lph4_ch4nn3l_h1d3s}
```
