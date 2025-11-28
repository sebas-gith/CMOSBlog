---
title: "The Chef's Secret Recipe"
description: 'This challenge involves a binary that validates a flag based on a hardcoded "recipe." The program generates a secret string internally and compares it against the argument provided by the user. The goal is to statically analyze the code to reconstruct the generated string.'
pubDate: 'Nov 28 2025'
heroImage: ''
ctf: 'HeroCTF'
---

# Reversing Challenge Writeup: The Chef's Secret Recipe

## Overview

This challenge involves a binary that validates a flag based on a hardcoded "recipe." The program generates a secret string internally and compares it against the argument provided by the user. The goal is to statically analyze the code to reconstruct the generated string.

## Static Analysis

### 1\. The "Ingredient" Functions

The binary contains a large number of small, seemingly unrelated functions (e.g., `bake`, `perfect`, `sift`, `flour`).

Upon inspection, we see that each of these functions is a pure function that immediately returns a constant 64-bit integer value. These integer values are, in fact, the hexadecimal representation of the ASCII characters that make up the flag.

**Example:**

```c
004011a9    int64_t bake() __pure
004011b3        return 0x48  // Hex 48 is 'H' in ASCII
```

### 2\. The `parse_recipe` Function

This function (starting at `00401417`) is responsible for constructing the final flag string:

1.  It copies the hardcoded "recipe" text from `main` and tokenizes it (splits it into individual words).
2.  It uses `normalize_word` to convert each token to lowercase and likely filter non-alphanumeric characters.
3.  It enters a double loop: an outer loop iterating through the words (`i`), and a crucial inner loop iterating through an array of ingredient names, indexed by `j` (from 0 to 40).
4.  The key logic is:
    ```c
    // Simplified Pseudocode
    for (int64_t j = 0; j <= 0x28; j += 1) { 
        if (strcmp(current_word, ingredients[j]) == 0) {
            // Store the result of the function call into the j-th position of the flag buffer
            flag_buffer[j] = ingredient_functions[j]();
            break; 
        }
    }
    ```

### 3\. The Construction Mechanism

The critical observation is that the code uses the **index `j` of the matching ingredient** to determine the position in the output buffer (`flag_buffer[j]`).

Since the "recipe" text provided in `main` contains all the ingredient keywords, the program successfully executes every function and places its character in the buffer based on its sequential index in the function list. The flag is therefore the concatenation of the return values in the order they appear in the binary's address space.

## Solution

By mapping the return value of each function (in the order they are defined) to its corresponding ASCII character, we reconstruct the flag:

| Index | Function Name | Return (Hex) | ASCII Character |
| :--- | :--- | :--- | :--- |
| 0 | `bake` | 0x48 | **H** |
| 1 | `perfect` | 0x65 | **e** |
| 2 | `sift` | 0x72 | **r** |
| 3 | `flour` | 0x6f | **o** |
| 4 | `sugar` | 0x7b | **{** |
| 5 | `crack` | 0x30 | **0** |
| 6 | `eggs` | 0x68 | **h** |
| 7 | `melt` | 0x5f | **\_** |
| 8 | `butter` | 0x4e | **N** |
| 9 | `blend` | 0x30 | **0** |
| 10 | `vanilla` | 0x5f | **\_** |
| ... | *(Continued mapping)* | ... | ... |
| 28 | `parchment`| 0x5f | **\_** |
| 29 | `timer` | 0x43 | **C** |
| 30 | `light` | 0x34 | **4** |
| 31 | `candle` | 0x6b | **k** |
| 32 | `plate` | 0x33 | **3** |
| 33 | `garnish` | 0x5f | **\_** |
| 34 | `frosting` | 0x52 | **R** |
| 35 | `pinch` | 0x33 | **3** |
| 36 | `salt` | 0x63 | **c** |
| 37 | `crushed` | 0x31 | **1** |
| 38 | `nuts` | 0x70 | **p** |
| 39 | `touch` | 0x65 | **e** |
| 40 | `sweetness`| 0x7d | **}** |

## The Flag

The concatenated string forms the solution:

`Hero{0h_N0_y0u_60T_My_S3cReT_C4k3_R3c1pe}`