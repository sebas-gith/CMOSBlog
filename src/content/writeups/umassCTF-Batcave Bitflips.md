---
title: "Batcave Bitflips"
description: 'Un binario que pide una License key, para mostrarnos la flag. Nuestra tarea sera entender el binario para ver donde se oculta la key (O no).'
pubDate: '4-11-2026'
heroImage: ''
ctf: 'umassCTF'
---

- **Dificultad:** *Medium*
- **Categoria:** *Reversing*
- **Herramientas:** *(Binary Ninja, ghidra, C++)*

### Descripción 

Un binario que pide una License key, para mostrarnos la flag. Nuestra tarea sera entender el binario para ver donde se oculta la key (O no).

#### Vista general.

```sh
kali  umassCTF  11:07  ./batcave_license_checker 
=================================================================================
_-_-_-_-_-_-_-_-_-_-_- BATCAVE LICENSE VERIFICATION (Beta) _-_-_-_-_-_-_-_-_-_-_-
=================================================================================

ENTER LICENSE KEY: sebastian_es_un_ctf_player
COMPUTING...
HASHED KEY: e883287aaadbe200c00ad3b959e8137a8a68b8fa6a52e9386808b8d3d96ac37a
VERIFYING...
INVALID LICENSE - PLEASE CONTACT ALFRED
```
Vemos que me manda a contactar a ALFRED y tambien le aplica un hasheo a mi input, parece que ese hasheo es particular de la aplicacion.

### Desensamblado del codigo

En Ghidra en la funcion main veo la logica de la aplicación y la parte mas importante

```c
  puts("=================================================================================");
  puts("_-_-_-_-_-_-_-_-_-_-_- BATCAVE LICENSE VERIFICATION (Beta) _-_-_-_-_-_-_-_-_-_-_-");
  puts("=================================================================================\n");
  __stream = fdopen(0,"r");
  if (__stream == (FILE *)0x0) {
                    /* WARNING: Subroutine does not return */
    exit(1);
  }
  printf("ENTER LICENSE KEY: ");
  cInput = fgets(input,0x21,__stream);
  if (cInput == (char *)0x0) {
                    /* WARNING: Subroutine does not return */
    exit(1);
  }
  input[0x20] = 0;
  puts("COMPUTING...");
  hash(input,&local_58);
  __ptr = (uchar *)bytes_to_hex(&local_58,0x20);
  sig = __ptr;
  printf("HASHED KEY: %s\n");
  free(__ptr);
  puts("VERIFYING...");
  iVar1 = verify((EVP_PKEY_CTX *)&local_58,sig,siglen,in_RCX,in_R8);
  if (iVar1 == 0) {
    puts("INVALID LICENSE - PLEASE CONTACT ALFRED");
                    /* WARNING: Subroutine does not return */
    exit(1);
  }
  puts("LICENSE GOOD - DECRYPTING BAT DATA...");
  decrypt_flag(&local_58);
  printf("FLAG: %s\n",FLAG);
  if (local_10 != *(long *)(in_FS_OFFSET + 0x28)) {
                    /* WARNING: Subroutine does not return */
    __stack_chk_fail();
  }
  return 0;
}
```

Vemos las funciones que se le aplican a nuestro input **hash -> bytes_to_hex -> verify**

Viendo el codigo detenidamente vemos que nuestro input se comprueba en **verify()** despues de todos los cambios que se le hacen.

```c
int verify(EVP_PKEY_CTX *ctx,uchar *sig,size_t siglen,uchar *tbs,size_t tbslen)

{
  int iVar1;
  
  iVar1 = memcmp(ctx,EXPECTED,0x20);
  return (int)(iVar1 == 0);
}
```

Este codigo lo unico que hace es comprobar nuestro input con **EXPECTED** con **memcmp()**. POR lo tanto si conocemos *EXPECTED* ya sabriamos los bytes de la key despues del proceso de **hash -> bytes_to_hex**. Por lo tanto una idea que tuve fue aplicar el proceso inverso para obtener la key.

#### Viendo .data

Viendo *.data* me encuentro una "LICENSE_KEY".

```sh
=================================================================================
_-_-_-_-_-_-_-_-_-_-_- BATCAVE LICENSE VERIFICATION (Beta) _-_-_-_-_-_-_-_-_-_-_-
=================================================================================

ENTER LICENSE KEY: !_batman-robin-alfred_((67||67))                     
COMPUTING...
HASHED KEY: fa189b817a02bbd3f1a88bf1c942211b80fa61fb39aa30708960d9020b71e0e3
VERIFYING...
INVALID LICENSE - PLEASE CONTACT ALFRED                                      
```

Fue muy ingenuo de mi parte creer que esa era la LICENSE_KEY real.

#### Volviendo a la ingenieria inversa

Viendo el codigo veo la funcion ***decrypt_flag()***. Que se le pasa nuestro input despues de todo el proceso que dije anteriormente.

```c
void decrypt_flag(long param_1)

{
  int i;
  
  for (i = 0; i < 0x20; i = i + 1) {
    FLAG[i] = FLAG[i] | *(byte *)(param_1 + i % 0x20);
  }
  return;
}
```
Vemos que se le pasa nuestro input a esa funcion y se le aplica este proceso a cada byte de una variable global que se llama **FLAG**, por logica esa tiene que ser la flag.

Pero ya tenemos los bytes que espera la funcion para desencriptar la flag. Que estan en **EXPECTED**. Entonces solo tendriamos que copiar los bytes desde el mismo Ghidra de la *FLAG*  y de *EXPECTED*.

#### Primer PoC

Copiando exactamente el codigo de Ghidra

```cpp
#include <bits/stdc++.h>

using namespace std;

uint8_t FLAG[] = { 0x6e, 0x19, 0x34, 0x49, 0x77, 0x7d, 0xf0, 0x5a, 0x07, 0xb4, 0x33, 0xa6, 0x8c, 0xe6, 0xe6, 0x17, 0xfb, 0xe9, 0x6f, 0xae, 0x2e, 0xe5, 0x26, 0xc3, 0x70, 0xe3, 0xc4, 0x7d, 0x27, 0x7f, 0x2b, 0x00 };
uint8_t EXPECTED[] = { 0x3b, 0x54, 0x75, 0x1a, 0x24, 0x06, 0xaf, 0x05, 0x77, 0x80, 0x47, 0xc5, 0xe4, 0x83, 0xd3, 0x48, 0xcb, 0x87, 0x30, 0xde, 0x1a, 0x91, 0x45, 0xab, 0x15, 0xc7, 0x9b, 0x22, 0x04, 0x02, 0x2b, 0xee };
void decrypt_flag()
{
  
  for (int i = 0; i < 0x20; ++i) {
    FLAG[i] = FLAG[i] | (EXPECTED[i% 0x20]);
    cout<<FLAG[i];
  }
  cout<<endl;
  return;
}

int main(){
    decrypt_flag();
}
```

```sh
kali  umassCTF  12:17  ./decrypt_flag           
]u[w�_w�w����_���>�g�u��'+�
```
Pero si habia hecho el codigo igual que en ghidra. Por que no funciona????

#### PoC Definitivo

```cpp
#include <bits/stdc++.h>

using namespace std;

uint8_t FLAG[] = { 0x6e, 0x19, 0x34, 0x49, 0x77, 0x7d, 0xf0, 0x5a, 0x07, 0xb4, 0x33, 0xa6, 0x8c, 0xe6, 0xe6, 0x17, 0xfb, 0xe9, 0x6f, 0xae, 0x2e, 0xe5, 0x26, 0xc3, 0x70, 0xe3, 0xc4, 0x7d, 0x27, 0x7f, 0x2b, 0x00 };
uint8_t EXPECTED[] = { 0x3b, 0x54, 0x75, 0x1a, 0x24, 0x06, 0xaf, 0x05, 0x77, 0x80, 0x47, 0xc5, 0xe4, 0x83, 0xd3, 0x48, 0xcb, 0x87, 0x30, 0xde, 0x1a, 0x91, 0x45, 0xab, 0x15, 0xc7, 0x9b, 0x22, 0x04, 0x02, 0x2b, 0xee };
void decrypt_flag()
{
  
  for (int i = 0; i < 0x20; ++i) {
    FLAG[i] = FLAG[i] ^ (EXPECTED[i% 0x20]);
    cout<<FLAG[i];
  }
  cout<<endl;
  return;
}

int main(){
    decrypt_flag();
}
```
```sh
kali  umassCTF  12:25  ./decrypt_flag                      
UMASS{__p4tche5_0n_p4tche$__#}�
```

Ahora si funciona. Creo que ghidra tuvo un error con el *OR* y el *XOR*, gracias a que prove el *^* pude ver la flag.

#### Flag

```sh
UMASS{__p4tche5_0n_p4tche$__#}
```

#### Conclusión

El binario presenta dos puntos clave:
- Validación basada en memcmp contra un valor estático (EXPECTED)
- Uso de una operación reversible (XOR) mal interpretada como OR
Esto permite evitar completamente la necesidad de recuperar la license key y atacar directamente el mecanismo de desencriptado.