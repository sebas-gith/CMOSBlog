---
title: "Not Quite Optimal"
description: 'Un binario troll que te pide rogarle por la flag y ejecuta una operación matemática absurdamente gigante que agota la RAM. Para resolverlo, combiné reversing clásico con la ayuda de IA para bypassear el cálculo infinito usando teoría de números.'
pubDate: '5-4-2026'
heroImage: ''
ctf: 'ritsecCTF'
---

- **Dificultad:** *Hard*
- **Categoria:** *Reversing / Crypto*
- **Herramientas:** *(Binary Ninja, ghidra, gdb, C/C++, Gemini)*

### Descripción 

Un binario troll que te pide rogarle por la flag. Luego de darle las contraseñas correctas, ejecuta una operación matemática absurdamente gigante que agota toda tu memoria RAM y el sistema mata el proceso. Mi tarea era bypassear ese cálculo infinito. Como la matemática avanzada no es mi fuerte, hice equipo con Gemini: yo me encargué de la ingeniería inversa del binario, y la IA se encargó de domar la criptografía.

#### Vista general.

```sh
kali  RisecCTF  13:52  ./not_quite_optimal
<       haiiii what r u doin here?

>       looking for the flag        

<       whoaaaa i know where to find that... say the magic word and ill get it for you

>       please

<       i couldnt hear u... could u try speaking a bit louder pls 🥺

>       PLEASE MAY I HAVE THE FLAG

<       waow i thought ud never ask... lemme go get it for you...
        ...
        ...
        RS{4_littl3_bi7_0f_nu
zsh: killed     ./not_quite_optimal
````

Como podemos ver, el binario primero se hace el gracioso pidiendo unas frases exactas. Al dárselas, empieza a imprimir la flag, pero de la nada el proceso muere (`zsh: killed`).

### Desensamblado del codigo

En Ghidra y Binary Ninja me puse a revisar la función `main`. La primera parte era puro salto condicional con los `strcmp` de las frases que vimos arriba. Pero cuando pasamos eso, el programa entra a un bucle que llama a la función `sub_401800` 84 veces (0x54).

```c
00401428        int32_t i_1 = i
0040142a        i += 1
00401435        putchar(c: zx.d(sub_401800(i_1)))
00401441        fflush(fp: stdout)
00401449    while (i != 0x54)
```

Al revisar esa función y la que le sigue (`sub_4015f0`), noté que estaba lleno de funciones extrañas como `__gmpz_mul` y `__gmpz_inits`.

```c
004016de        if ((*var_40 & 1) != 0)
00401779            __gmpz_mul(arg1, arg1, &var_58)
004016ef        __gmpz_fdiv_q_2exp(&var_48, &var_48, 1)
```

Por si no lo sabían, GMP es una librería de C para manejar números gigantes de precisión infinita. De por sí, leer desensamblado con GMP es un dolor de cabeza.

#### El problema de la RAM (OOM Killer)

No entendía por qué crasheaba el binario si parecía estar funcionando, así que le pasé el comportamiento y las funciones a **Gemini**. Mi asistente analizó el uso de la librería GMP y me dio la respuesta al misterio: el programa estaba calculando una tetración (una torre de potencias infinitas):

a ^^ b = a^(a^(a^... b veces))

Gemini me explicó que el binario tomaba una base y una altura de la memoria y la multiplicaba recursivamente. Llegaba a números tan absurdamente grandes (con miles de millones de dígitos) que me llenaban la memoria RAM, y el sistema operativo (OOM Killer) terminaba asesinando el proceso para salvar mi compu. ¡Por eso salía el `zsh: killed`\!

#### Secuestrando el registro en Binja

Quise comprobar la lógica de cómo el binario sacaba las letras, así que me puse creativo en Binary Ninja y parcheé el registro `rbx = 0` en la función que generaba los caracteres, para ver si escupía algo sin crashear.

```sh
<       waow i thought ud never ask... lemme go get it for you...
        ...
        ...
        RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR
        that was exhausting, but there u are... mrrp meow   
```

¡Me imprimió pura R\! Ahí confirmé que el programa iba calculando la flag letra por letra basándose en un índice en la memoria. Como lo forcé a quedarse en el índice 0, me calculó la primera letra de la flag (`R`) 84 veces seguidas antes de que los números se volvieran lo suficientemente grandes para matarme la RAM.

#### Entendiendo la matematica

Aquí es donde tuve que cederle el volante por completo a Gemini, porque la teoría de números dura me dejaba en el aire. Juntos revisamos el cuello de botella al final de la maldita función de GMP:

```c
0040172f    result = (__gmpz_fdiv_ui(arg1, 0x100) + 1) u>> 1
```

Gemini me hizo notar que el programa hacía un cálculo gigante solo para al final sacarle el módulo 256 (`0x100`), sumarle 1 y dividirlo entre 2 (`u>> 1`).

Con esa información, la IA me explicó el truco matemático: según el Teorema de Euler, no hace falta calcular toda la torre infinita. Podemos ir reduciendo los exponentes usando la función indicatriz de Euler (*phi(m)*).
Como phi(256) = 128, y phi(128) = 64, la torre de exponentes colapsa a los 8 niveles (ya que cualquier número módulo 1 es 0).

#### Encontrando los bytes de la flag

Con el problema matemático resuelto en teoría, volví a lo mío (el reversing). Sabiendo que el binario saca las bases y alturas desde la memoria usando el índice, fui a la dirección `0x4022a0` en mi desensamblador.

```text
004022a0  3b c8 0a 00 00 00 00 00 02 00 00 00 00 00 00 00 75 2b 19 00 00 00 00 00 02 00 00 00 00 00 00 00
004022c0  c5 95 32 00 00 00 00 00 02 00 00 00 00 00 00 00 97 0b 38 00 00 00 00 00 02 00 00 00 00 00 00 00
```

Hice un volcado de todos los 84 pares (16 bytes cada uno, little-endian de 64 bits) que conformaban la tabla de variables entera.

### POC

En lugar de intentar parchear el binario para meter toda la lógica de Euler en ensamblador puro, le pasé los bytes extraídos a Gemini y le pedí que me escribiera el *solver* en C puro, aplicando la matemática que descubrimos juntos.

```c
#include <stdio.h>
#include <stdint.h>

// Los datos extraídos de la memoria (Base y Altura)
uint64_t data[] = {
    0x0a, 0x02, 0x192b75, 0x02, 0x3295c5, 0x02, 0x380b97, 0x02, 
    0x4b32cd, 0x02, 0x644a27, 0x02, 0x6ea6d1, 0x02, 0x7a2a17, 0x02, 
    0x8cea17, 0x02, 0xa7d527, 0x02, 0xb9a435, 0x02, 0xc1fecd, 0x02, 
    0xd8701b, 0x02, 0xe7bcd1, 0x02, 0xf8807d, 0x02, 0x0105b8cd, 0x02, 
    0x0119019f, 0x02, 0x012d65d3, 0x02, 0x01377fcd, 0x02, 0x014ad443, 0x02, 
    0x015dc5a9, 0x02, 0x99, 0x03, 0x013b, 0x03, 0xf5, 0x03, 
    0x011b, 0x03, 0x010d, 0x03, 0x0197, 0x03, 0x012f, 0x03, 
    0xf5, 0x03, 0x019f, 0x03, 0x011b, 0x03, 0x01f1, 0x03, 
    0x020d, 0x03, 0x01e3, 0x03, 0x01f5, 0x03, 0x0253, 0x03, 
    0x01f5, 0x03, 0x021b, 0x03, 0x030d, 0x03, 0x022f, 0x03, 
    0x02a9, 0x03, 0x031b, 0x03, 0x93bd, 0x04, 0x05c80d, 0x04, 
    0x083417, 0x04, 0x0bfe63, 0x04, 0x0ecef1, 0x04, 0x0fe69f, 0x04, 
    0x136563, 0x04, 0x17dbf5, 0x04, 0x18ef0d, 0x04, 0x1d4661, 0x04, 
    0x1f1071, 0x04, 0x2300bb, 0x04, 0x266bf5, 0x04, 0x28e4f5, 0x04, 
    0x2c2d53, 0x04, 0x2e4a71, 0x04, 0x3170c1, 0x04, 0x34e71b, 0x04, 
    0x399929, 0x04, 0x3ba955, 0x04, 0x4000bd, 0x04, 0xd38f, 0x02475e, 
    0x13c19f, 0x093b18, 0x250971, 0x188b49, 0x3f5f29, 0x2140b1, 
    0x512453, 0x2257b6, 0x597d8f, 0x2cc821, 0x6dd271, 0x3403c8, 
    0x8258c1, 0x4293de, 0x8a3cf5, 0x4bc176, 0xa5d78f, 0x4d0988, 
    0xb286f3, 0x57c733, 0xc4808f, 0x608647, 0xd43161, 0x6a62c7, 
    0xe399c1, 0x758263, 0xf535c1, 0x77e604, 0x010beff5, 0x8485c0, 
    0x011680f3, 0x8ed167, 0x01274329, 0x964d2f, 0x013dfb89, 0x9eb989, 
    0x014b5af5, 0xa1feb6, 0x0154e4b9, 0xac71a9
};

// Algoritmo GCD (Máximo Común Divisor)
uint64_t gcd(uint64_t a, uint64_t b) {
    while (b != 0) {
        uint64_t temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

// Función Indicatriz de Euler
uint64_t phi(uint64_t n) {
    uint64_t amount = 0;
    for (uint64_t k = 1; k <= n; k++) {
        if (gcd(n, k) == 1) {
            amount++;
        }
    }
    return amount;
}

// Exponenciación Modular Rápida
uint64_t power_mod(uint64_t base, uint64_t exp, uint64_t mod) {
    uint64_t res = 1;
    base = base % mod;
    while (exp > 0) {
        if (exp % 2 == 1) res = (res * base) % mod;
        exp = exp >> 1;
        base = (base * base) % mod;
    }
    return res;
}

// Función recursiva del Teorema de Euler
uint64_t solve_tower_mod(uint64_t base, uint64_t height, uint64_t modulo) {
    if (modulo == 1) return 0;
    if (height == 0) return 1;
    if (height == 1) return base % modulo;

    uint64_t totient = phi(modulo);
    uint64_t exp = solve_tower_mod(base, height - 1, totient);
    
    if (height > 1) {
        exp += totient;
    }

    return power_mod(base, exp, modulo);
}

int main() {
    printf("[+] Calculando la flag...\n");
    
    // El arreglo tiene 84 pares (168 elementos)
    for (int i = 0; i < 168; i += 2) {
        uint64_t base = data[i];
        uint64_t height = data[i+1];
        
        uint64_t raw_val = solve_tower_mod(base, height, 256);
        
        // El desplazamiento mágico del binario que descubrimos
        char char_val = (char)((raw_val + 1) >> 1); 
        
        printf("%c", char_val);
    }
    
    printf("\n");
    return 0;
}
```

#### Compilando y ejecutando el codigo

```sh
kali  RisecCTF  16:30  gcc ./solver.c -o solver
                                                                                                                        
kali  RisecCTF  16:31  ./solver
[+] Calculando la flag...
Tesoro recuperado: RS{4_littl3_bi7_0f_numb3r_th30ry_n3v3r_hur7_4ny0n3_19b3369a25c78095689a38f81aa3f5e3}
```

#### Flag

```sh
RS{4_littl3_bi7_0f_numb3r_th30ry_n3v3r_hur7_4ny0n3_19b3369a25c78095689a38f81aa3f5e3}
```
