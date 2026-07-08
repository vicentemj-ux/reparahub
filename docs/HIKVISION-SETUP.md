# Configuracion de Camara Hikvision en ReparaHub

Esta guia explica como conectar una camara Hikvision para que ReparaHub registre visitas automaticamente en la Bitacora de Visitas.

## Que hace cada parte

- **Webhook Hikvision:** la camara envia un evento a ReparaHub cuando detecta movimiento, cruce de linea o entrada a zona.
- **Snapshot ISAPI:** ReparaHub solicita una imagen fija a la camara para guardar evidencia de entrada.
- **RTSP / go2rtc:** opcional y avanzado. Sirve para preparar video en vivo desde una PC local del taller.

> No guardes credenciales reales en documentos compartidos. Capturalas solo en Configuracion > Hardware.

## Requisitos

- Camara Hikvision con HTTP Host, Alarm Server o Notify Surveillance Center.
- Camara y red configuradas con salida a internet para poder llamar el webhook de ReparaHub.
- IP local fija o reservada para la camara, recomendada para snapshot ISAPI.
- Plan PRO o trial activo.

## 1. Configurar ReparaHub

1. Abre `Configuracion > Hardware`.
2. Activa `Deteccion`.
3. En `Deteccion automatica`, genera o copia la URL webhook.
4. En `Snapshot de evidencia`, captura:
   - IP o host local de la camara.
   - Puerto HTTP, normalmente `80`.
   - Canal, normalmente `101`.
   - Usuario y contrasena de la camara.
5. Presiona `Probar snapshot`.
6. Si la imagen se muestra correctamente, guarda la configuracion.

## 2. Configurar webhook en Hikvision

En el panel web de la camara, busca una seccion similar a:

- `Network > Advanced Settings > Alarm Server`
- `Platform Access > HTTP Host`
- `Event > Trigger Actions`

Configura:

- **Method:** `POST`
- **URL:** la URL webhook copiada desde ReparaHub.
- **Content-Type:** `application/xml` cuando la camara lo permita.
- **Trigger:** activa `Notify Surveillance Center`, `HTTP Host` o equivalente.

Eventos recomendados:

- `VMD`
- `linedetection`
- `fielddetection`

## 3. Snapshot ISAPI

ReparaHub genera la URL automaticamente si capturas IP, puerto y canal:

```text
http://IP_DE_LA_CAMARA:80/ISAPI/Streaming/channels/101/picture
```

Si tu modelo usa una ruta distinta, puedes capturar una URL de snapshot manual en el campo `Snapshot JPEG opcional`.

## 4. Video RTSP avanzado con go2rtc

El video en vivo no es necesario para registrar visitas. Es una opcion futura/avanzada para ver streams dentro del sistema.

1. Captura la fuente RTSP en `Video RTSP avanzado`.
2. Descarga `go2rtc.yaml`.
3. Instala go2rtc en una PC del local.
4. Ejecuta:

```bash
go2rtc -config go2rtc.yaml
```

Si el RTSP incluye usuario y contrasena, el YAML tambien los incluira. Guardalo solo en la PC del local.

## Solucion de problemas

### La camara no crea visitas

- Revisa que el token del webhook sea el correcto.
- Confirma que la camara tenga gateway y DNS configurados.
- Verifica que el evento este activo y dentro del filtro configurado en ReparaHub.
- Revisa logs de eventos en el panel Hikvision.

### El snapshot no carga

- Verifica IP, puerto, usuario, contrasena y canal.
- Prueba abrir la URL ISAPI desde una PC en la misma red.
- Si la camara cambio de IP, reserva la IP desde el router o usa SADP Tool.

### La imagen sale oscura

- Ajusta luz, IR y exposicion en el panel de imagen de la camara.
- Evita apuntar directo a puertas con contraluz fuerte.

## Seguridad

- Si sospechas que el webhook se compartio, usa `Regenerar token` en Configuracion > Hardware.
- No publiques RTSP, usuario ni contrasena.
- Usa contrasenas distintas por local cuando sea posible.
