---
title: "KeyGen"
description: "Este programa valida un número de serie con restricciones matemáticas (XOR, suma, rotación de bits). Genera un serial válido."
pubDate: "4-1-2026"
heroImage: "../../assets/s4vitarctf/rev/KeyGen/flag.png"
ctf: "s4vitarCTF1"
---

- **Dificultad:** *Difícil*
- **Categoría:** *Reversing*
- **Herramientas:** *(Python, Ghidra)*

### Descripción 

Este programa valida un número de serie con restricciones matemáticas (XOR, suma, rotación de bits). Genera un serial válido.

### Desensamblado del código

Al desensamblar el código, vemos una función que hace un XOR.

```c
undefined8 FUN_001010a0(void)

{
  int iVar1;
  char *pcVar2;
  undefined8 uVar3;
  size_t sVar4;
  long lVar5;
  byte local_148 [32];
  byte local_128 [23];
  undefined1 local_111;
  char local_108 [256];
  
  puts("=== KeyGen Challenge ===");
  puts("Format: XXXX-XXXX-XXXX-XXXX (hex)");
  printf("Enter a valid serial: ");
  pcVar2 = fgets(local_108,0x100,stdin);
  uVar3 = 1;
  if (pcVar2 != (char *)0x0) {
    sVar4 = strcspn(local_108,"\n");
    local_108[sVar4] = '\0';
    iVar1 = FUN_00101280(local_108); // Esto aquí nada más verifica que el input tenga el formato correcto 
    if (iVar1 == 0) {
      puts("Invalid serial.");
      uVar3 = 0;
    }
    else {
      local_148[0] = 0x3b;
      local_148[1] = 0x47;
      local_148[2] = 0x26;
      local_148[3] = 8;
      local_148[4] = 0x18;
      local_148[5] = 0x40;
      local_148[6] = 10;
      local_148[7] = 0x14;
      local_148[8] = 0x40;
      local_148[9] = 0x1d;
      local_148[10] = 0x2c;
      local_148[0xb] = 0x1e;
      local_148[0xc] = 0x47;
      local_148[0xd] = 0;
      local_148[0xe] = 7;
      local_148[0xf] = 0x40;
      local_148[0x10] = 1;
      local_148[0x11] = 0x2c;
      local_148[0x12] = 0x41;
      local_148[0x13] = 0x43;
      local_148[0x14] = 0x41;
      local_148[0x15] = 0x45;
      local_148[0x16] = 0xe;
      lVar5 = 0;
      do {
        local_128[lVar5] = local_148[lVar5] ^ 0x73;
        lVar5 = lVar5 + 1;
      } while (lVar5 != 0x17);
      local_111 = 0;
      printf("Valid serial! Flag: %s\n");
      uVar3 = 0;
    }
  }
  return uVar3;
}
````

Podría haberlo hecho en [Cyberchef](https://cyberchef.io/), pero esta vez decidí hacerlo en Python.

```py
flag = [
    0x3b, 0x47, 0x26, 0x08, 0x18, 0x40, 0x0a, 0x14,
    0x40, 0x1d, 0x2c, 0x1e, 0x47, 0x00, 0x07, 0x40,
    0x01, 0x2c, 0x41, 0x43, 0x41, 0x45, 0x0e
]

la_real_flag = [chr(ch ^ 0x73) for ch in flag]
print("".join(la_real_flag))
```

### Flag

```sh
H4U{k3yg3n_m4st3r_2026}
```
