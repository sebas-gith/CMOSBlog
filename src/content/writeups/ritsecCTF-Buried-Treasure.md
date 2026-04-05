---
title: "Buried Treasure"
description: 'Un binario con multiples capas para evitar su entendimiento ademas de que cifra la flag con una operación matematica, nuestra tarea es entender como funciona el binario y obtener la flag.'
pubDate: '4-4-2026'
heroImage: ''
ctf: 'ritsecCTF'
---

- **Dificultad:** *Medium*
- **Categoria:** *Reversing*
- **Herramientas:** *(Binary Ninja, ghidra, python, gdb)*

### Descripción 

Un binario con multiples capas para evitar su entendimiento ademas de que cifra la flag con una operación matematica, nuestra tarea es entender como funciona el binario y obtener la flag.

#### Vista general.

```sh
kali  RisecCTF  14:05  ./buried_treasure  
enter the flag: 
```
Como podemos ver el binario pide que nosotros ingresemos la flag, entonces por logica tenemos que desensamblar el binario para encontrar la flag.

### Desensamblado del codigo

En ghidra y binary ninja trate de desensamblar el codigo pero noto que esta complicado, creia que era un tipo de ofuscacición, pero estaba muy complicado de entender y no podia ni encontrar la función main.

```c
0025dbab    char* sub_25dbab()

0025dbbf        int64_t rcx = data_260b38
0025dbcf        char* result
0025dbcf        int64_t* var_78 = &result
0025dbd2        char var_60 = 0
0025dbd6        data_260b38 = &var_78
0025dbe4        void* const var_70 = &data_25dbeb
0025dbfe        sub_25cd11()
0025dbfe        

```

Una función para que veas lo complicado que estaba de entender.

Entendiendo el tipo de archivo 
```sh
kali  RisecCTF  16:14  file ./buried_treasure
./buried_treasure: ELF 64-bit LSB executable, x86-64, version 1 (SYSV), statically linked, strippe
```
Haciendole un strings note lo siguiente:

```sh
kali  RisecCTF  16:20  strings ./buried_treasure | tail -n 12
Linker: LLD 20.1.1 (https://github.com/tinygo-org/llvm-project 670759811adc85df52f410d7306788fabfc6242d)
clang version 20.1.1 (https://github.com/tinygo-org/llvm-project 670759811adc85df52f410d7306788fabfc6242d)
TinyGo version 0.40.1
.shstrtab
.rodata
.eh_frame
.text
.got
.relro_padding
.data
.bss
.comment
```
Veo que el programa fue hecho con TinyGo, que es un compilador de go para sistemas embebidos o sistemas muy pequeñas. De por si decompilar Go se ma hace dificil, esto se me hace mucho mas dificil.

Debido a que no entendia ni mierda del desensamblado, decidi debugearlo para ver si por lo menos asi entendia mejor el flujo de como funcionaba el programa.

En gdb:

```sh

wndbg> r
Starting program: /home/kali/CTF/RisecCTF/buried_treasure 
process 230186 is executing new program: /proc/230186/exe
process 230186 is executing new program: /proc/230186/exe
process 230186 is executing new program: /proc/230186/exe
process 230186 is executing new program: /proc/230186/exe
process 230186 is executing new program: /proc/230186/exe
process 230186 is executing new program: /proc/230186/exe
process 230186 is executing new program: /proc/230186/exe
process 230186 is executing new program: /proc/230186/exe
process 230186 is executing new program: /proc/230186/exe
process 230186 is executing new program: /proc/230186/exe
process 230186 is executing new program: /proc/230186/exe
process 230186 is executing new program: /proc/230186/exe
process 230186 is executing new program: /proc/230186/exe
process 230186 is executing new program: /proc/230186/exe
process 230186 is executing new program: /proc/230186/exe
enter the flag: RS{Hola}

```

Veo eso de process pero no le doy importancia

```sh
 RAX  1
 RBX  1
*RCX  2
 RDX  0xa
 RDI  0
 RSI  0x7fffb7e004a0 ◂— 0xa73 /* 's\n' */
 R8   0x7fffb7e00000 —▸ 0x7fffffffe101 ◂— 'COLORFGBG=15;0'
 R9   3
 R10  0x7ffffffffffff000
 R11  0x346
 R12  8
 R13  8
 R14  0x7fffb7e004a0 ◂— 0xa73 /* 's\n' */
 R15  2
 RBP  8
 RSP  0x7fffffffdc70 ◂— 0x451a
*RIP  0x202fe0 ◂— add rcx, -2
────────────────────────────────────────────────────────────────────────────────────────────────────[ DISASM / x86-64 / set emulate on ]────────────────────────────────────────────────────────────────────────────────────────────────────
   0x202fd3    cmp    dl, 0xa                      0xa - 0xa     EFLAGS => 0x246 [ cf PF af ZF sf IF df of ac ]  -> Compara el caracter actual con '\n'
   0x202fd6  ✘ jne    0x202ff5                    <0x202ff5>                                                     -> Si no es newline, salta (pero aquí no se toma porque DL=0xa)
 
   0x202fd8    test   rax, rax                     1 & 1     EFLAGS => 0x202 [ cf pf af zf sf IF df of ac ]     -> ¿RAX es 0? (no, es 8)
   0x202fdb  ✘ je     0x203011                    <0x203011>                                                    -> no se toma
 
   0x202fdd    mov    rcx, r15                         RCX => 2                                                  -> rcx = 9 (índice)
 ► 0x202fe0    add    rcx, -2                          RCX => 0 (2 + -2)                                         -> rcx = 7
   0x202fe4    mov    dl, byte ptr [r14 + r15 - 2]     DL, [0x7fffb7e004a0] => 0x73                              -> Carga byte en posición (r14+7) r14+7 = '}' (0x7d)
   0x202fe9    jmp    0x202ffb                    <0x202ffb>
    ↓
   0x202ffb    cmp    dl, 0xd      0x73 - 0xd     EFLAGS => 0x216 [ cf PF AF zf sf IF df of ac ]                -> Compara con '\r' (13 decimal)
   0x202ffe  ✔ cmovne rcx, rax                                                                                  -> no se toma si no es '\r', rcx = rax (8)
   0x203002    mov    r15, rcx     R15 => 1                                                                      -> r15 = 8
   0x202fe9    jmp    0x202ffb                    <0x202ffb>
    ↓
   0x202ffb    cmp    dl, 0xd       0x73 - 0xd     EFLAGS => 0x216 [ cf PF AF zf sf IF df of ac ]                
   0x202ffe  ✔ cmovne rcx, rax
   0x203002    mov    r15, rcx      R15 => 1                                                                    
   0x203005    cmp    rcx, 0x24     0x1 - 0x24     EFLAGS => 0x297 [ CF PF AF zf SF IF df of ac ]                 -> compara con 36
   0x203009  ✔ jne    0x203014                    <0x203014>                                                      -> 8 != 36 ,salta
    ↓
   0x203014    call   0x203132                                                                                    -> llama a una función probablemente la que dice no :(
```

Por lo menos aqui ya sabia que le flag tenia un tamaño de 36 caracteres.

Y se me ocurre ver las llamadas al sistema del programa para ello ejecuto el siguiente comando.

```sh
strace -f ./buried_treasure
```

Preguntandole a gemini sobre la respuesta del comando se da cuenta de esto:

```sh
memfd_create("", MFD_CLOEXEC) = 3
```

Vimos una cascada de 15 llamadas a memfd_create y execve("/proc/PID/fd/3"). El programa estaba creando archivos invisibles en la memoria RAM, escribiendo código en ellos y ejecutándolos recursivamente. Empezó pesando 350 KB y terminó en unos míseros 9 KB.

Una tecnica que se conoce como ***Fileless*** 

> El fileless malware es, más que un software malicioso, una forma de alojar malware en el sistema evitando dejar rastros en el disco duro del equipo infectado. En lugar de almacenar los archivos maliciosos en el disco, los atacantes aprovechan procesos legítimos del sistema operativo para ejecutar malware y llevar a cabo sus actividades maliciosas. Con esta forma de operar se persigue que el malware resida completamente en la memoria RAM, lo que lo hace invisible para muchos sistemas de protección tradicionales.

REF: [Fileless Malware](https://s2grupo.es/fileless-malware-que-es/)

```sh
kali  RisecCTF  18:19  strace -f -e execve ./buried_treasure
execve("./buried_treasure", ["./buried_treasure"], 0x7ffe3e91e8e8 /* 64 vars */) = 0
execve("/proc/583061/fd/3", [], 0x7fb34e05c780 /* 64 vars */) = 0
execve("/proc/583061/fd/3", [], 0x7fc2a32582f0 /* 64 vars */) = 0
execve("/proc/583061/fd/3", [], 0x7f1967854270 /* 64 vars */) = 0
execve("/proc/583061/fd/3", [], 0x7fdbd624feb0 /* 64 vars */) = 0
execve("/proc/583061/fd/3", [], 0x7f4dfbc4ba20 /* 64 vars */) = 0
execve("/proc/583061/fd/3", [], 0x7f7238a7a900 /* 64 vars */) = 0
execve("/proc/583061/fd/3", [], 0x7f8c6ba31ee0 /* 64 vars */) = 0
execve("/proc/583061/fd/3", [], 0x7f84eb02dcb0 /* 64 vars */) = 0
execve("/proc/583061/fd/3", [], 0x7f5630c29830 /* 64 vars */) = 0
execve("/proc/583061/fd/3", [], 0x7f6fa003efd0 /* 64 vars */) = 0
execve("/proc/583061/fd/3", [], 0x7f79c3218520 /* 64 vars */) = 0
execve("/proc/583061/fd/3", [], 0x7efff3c14310 /* 64 vars */) = 0
execve("/proc/583061/fd/3", [], 0x7f3967e0ff40 /* 64 vars */) = 0
execve("/proc/583061/fd/3", [], 0x7eff41e122c0 /* 64 vars */) = 0
execve("/proc/583061/fd/3", [], 0x7ff478c051f0 /* 64 vars */) = 0
enter the flag: 
```
Asi se verian las llamadas al sistemas de execve() del programa. 15 capas de Basura.

### Secuestrando al Jefe final.

Sabiendo que hay 15 capas de basura, no queria perder el tiempo depurándolas una por una. Habia que dejar que el programa hiciera su trabajo de desempaquetado y atraparlo justo cuando llegara al núcleo puro (la validación de la flag).

Abri dos terminales, la primera seria para ejecutar el binario:

```sh
kali  RisecCTF  21:22  ./buried_treasure &
[3] 719829
                                                                                                                    
enter the flag: [3]  + suspended (tty input)  ./buried_treasure
```
La segunda para ejecutar copiar el proceso que hace la validacion de la flag

```sh
kali  RisecCTF  21:24  cp /proc/719829/exe ./capa_final & chmod +x ./capa_final
```

Ya tenemos el binario que hace la validacion (el que no esta enpaquetado que pesa 9kb) ahora tenemos que desensamblarlo para entender como se encodea o encripta la flag:

En binary ninja entre todas las funciones veo la que hace la validación y noto el bucle que cifra nuestro input para luego compararlo.

```c
00203023                                    int64_t k_1 = 0x26
00203027                                    int64_t r13_2 = 0xd
0020302d                                    while (k_1 != 0x4a)
00203044                                        if (zx.q(rax_18[k_1 - 0x26]) * r13_2 + k_1 != (
00203044                                                &__elf_program_headers[5].virtual_address)[k_1])
00203046                                            sub_203132()
00203046                                            noreturn
00203046                                        
0020304f                                        int64_t rax_25 = k_1 - 0x23
00203052                                        k_1 += 1
00203055                                        r13_2 += 0xd
00203055                                        
0020305d                                        if (rax_25 == 0x26)
00203066                                            void* rax_26 = sub_202bec(8)
00203075                                            __builtin_strncpy(dest: rax_26, 
00203075                                                src: "meow :D\n", count: 8)
00203084                                            syscall(sys_write {1}, fd: 1, buf: rax_26, 
00203084                                                count: 8)
00203094                                            noreturn sub_2020b3(1) __tailcall
```

#### Desglosando la ecuación

En el if

***rax_18[k_1 - 0x26]*** *rax_18* es el texto que escribimos, *k1* es el contador que inicia desde 0x26(38 en decimal) Por lo tanto, k_1 - 0x26 en la primera vuelta del bucle es 38 - 38 = 0. Esto significa que está leyendo el primer carácter de tu input (el índice 0). 

***\* r13_2*** Multiplica el codigo de la letra por esta variable que vale *0xd* (13 en decimal) 

***+ k_1*** Le suma el valor del contador actual *k_1*
 
Y lo compara para ver si es distinto de ***(&__elf_program_headers[5].virtual_address)[k_1]***. Aqui segun binary ninja deberian estar los bytes de la flag, pero no estaban ahi.Si es distinto el programa llama la función *sub_203132()* que lo unico que muestra es no :(  y termina el programa. 

Mas abajo el programa incrementa *k_1* en una unidad y luego incrementa *k13_2* en 0xd, es decir que primero vale 13, luego 26, despues 39 y asi sucesivamente

#### Entendiendo la matematica.

*ValorEsperado = C * (13 * (i + 1)) + (38 + i)*


Donde *C* es nuestro caracter
E *i* la posición de de la letra.

#### Encontrando los bytes de la flag

El programa tiene a tabla escondida en la memoria con los 36 *Valores Esperados*.
Para esto lo que hizo gemini(sabiendo los primeros bytes de la flag ) que siempre empienzan con **RS{** fue aplicar la formula matematica a la *R* lo que seria 82 en ascii haciendo el calculo seria *82 * 13 + 38 = 1104* igual a 0x450 en hexadecimal por lo tanto el primer byte de la tabla tiene que ser ese valor en hexadecimal.]

En *gdb* corri el programa puse en break en la ubicacion del if *00203044* y para encontrar ese valor lo que hice fue poner esto en gdb:

```bash
pwndbg> find /g 0x200000, +0x10000, 0x450
0x200298
0x201298
warning: Unable to access 16000 bytes of target memory at 0x205120, halting search.
2 patterns found.
```

Y a partir de ahí, solo era hacer el x/36gx 0x200298 para volcar la tabla entera.

```sh
pwndbg> x/36gx 0x200298
0x200298:       0x0000000000000450      0x0000000000000895
0x2002a8:       0x00000000000012e5      0x00000000000009e9
0x2002b8:       0x0000000000001b55      0x0000000000001003
0x2002c8:       0x0000000000002b2f      0x00000000000026c5
0x2002d8:       0x000000000000302b      0x000000000000306d
0x2002e8:       0x00000000000040fc      0x0000000000003f91
0x2002f8:       0x000000000000208b      0x0000000000004e67
0x200308:       0x00000000000051b5      0x0000000000004d65
0x200318:       0x000000000000645a      0x0000000000005f47
0x200328:       0x0000000000003264      0x0000000000003815
0x200338:       0x0000000000007add      0x0000000000006a5d
0x200348:       0x0000000000003bcd      0x000000000000864d
0x200358:       0x0000000000003d2e      0x0000000000009ab9
0x200368:       0x0000000000008d79      0x0000000000009421
0x200378:       0x0000000000008c29      0x000000000000a4cb
0x200388:       0x0000000000005220      0x000000000000c4e5
0x200398:       0x00000000000055bd      0x000000000000c51b
0x2003a8:       0x000000000000ccad      0x000000000000e4cd
```

#### Despejando C

Ahora solo quedaba aplicar la formula despejando *C* con matematicas de primaria, quedaba de esta manera:


*C = (ValorEsperado - (38 + i)) / (13 * (i + 1))*

Solo queda aplicarle esa formula a cada byte que descubrimos en la tabla con *gdb*

### POC

```cpp

#include <bits/stdc++.h>

using namespace std;

int main() {
    vector<uint64_t> data_dump = {
        0x450, 0x895, 0x12e5, 0x9e9, 0x1b55, 0x1003, 0x2b2f, 0x26c5,
        0x302b, 0x306d, 0x40fc, 0x3f91, 0x208b, 0x4e67, 0x51b5, 0x4d65,
        0x645a, 0x5f47, 0x3264, 0x3815, 0x7add, 0x6a5d, 0x3bcd, 0x864d,
        0x3d2e, 0x9ab9, 0x8d79, 0x9421, 0x8c29, 0xa4cb, 0x5220, 0xc4e5,
        0x55bd, 0xc51b, 0xccad, 0xe4cd
    };

    string flag = "";
    for (size_t i = 0; i < data_dump.size(); ++i) {
        uint64_t val = data_dump[i];
        
        uint64_t k_1 = 38 + i; 

        uint64_t multiplier = 13 * (i + 1); 
        
        char char_code = static_cast<char>((val - k_1) / multiplier);
        
        flag += char_code;
    }

    cout << "Tesoro recuperado: " << flag << endl;

    return 0;
}

```
Compilando y ejecutando el codigo
```sh
kali  RisecCTF  23:19  g++ ./buried_treasure_solver.cpp -o buried_treasure_solve
                                                                                                                    
kali  RisecCTF  23:19  ./buried_treasure_solve                                  
Tesoro recuperado: RS{0k4y_i_th1nk_th47s_3n0ugh_l4y3rs}
```

#### Flag

```sh
RS{0k4y_i_th1nk_th47s_3n0ugh_l4y3rs}
```

![pwned gandalf](https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXc4bzRiaTc2Nmd2dGU4aDIyaWk1ZmJsdThucjRkbWVtMmI4aTdsayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/I0EvMPfvcfZoZY25ru/giphy.gif)