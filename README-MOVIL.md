# Regenera Móvil — contexto y brechas frente a `regenera-api`

Objetivo: que `voluntariado-app` (Expo / React Native) ofrezca la misma funcionalidad que la plataforma web `regenera-api` (Laravel + MongoDB + Sanctum), adaptada a móvil, y poder generar un **APK instalable**.

> Estado revisado contra el código de ambos repos. La app móvil es solo cliente: toda la lógica, permisos y validaciones viven en la API.

## 1. Stack

| | `regenera-api` (web + API) | `voluntariado-app` (móvil) |
|---|---|---|
| Framework | Laravel (PHP 8.2+), Blade + JS vanilla + Vite | Expo SDK 58, React Native 0.88, React 19, expo-router |
| BD | MongoDB (+ GridFS para imágenes) | — (consume la API) |
| Auth | Laravel Sanctum (Bearer) | Mismo token; guardado en `expo-secure-store` |
| Push | Web Push (VAPID) | **No implementado** |
| Mapa | Leaflet en `/mapa` | `react-native-maps` (nativo), lista + OSM en web |
| Tests | PHPUnit | `node --test` (`tests/*.test.mjs`) |

Configuración móvil: `.env` con `EXPO_PUBLIC_REGENERA_API_URL` (base de Laravel **sin** `/api`; en celular físico usar la IP LAN o una URL pública HTTPS).

## 2. Roles en la API
`usuario` (voluntario), `organizador`, `admin`. Rutas protegidas con `auth:sanctum` y `role:...`; lecturas públicas con `auth.optional`.

## 3. Estructura actual de la app móvil

```
src/app/            Rutas (expo-router)
  (tabs)/           index, voluntariados, flora-fauna, mas
  login, perfil, dashboard, inscripciones, notificaciones, asistencia-qr, impacto
  voluntariados/[id], flora-fauna/[id], articulos/(index,[id])
  organizador/      voluntariados, voluntariado-editor, voluntariado/[id]
  admin/            usuarios, usuario-editor, moderacion, auditoria
src/features/       Clientes de API + parsers por dominio (auth, voluntariados, ...)
tests/              Pruebas de parsers/filtros por dominio
```

## 4. Matriz de paridad por módulo

Leyenda: ✅ hecho · 🟡 parcial · ❌ falta

### Autenticación y cuenta
| Funcionalidad API | Endpoint(s) | Móvil |
|---|---|---|
| Login / registro / me / logout | `/auth/login`, `/auth/register`, `/auth/me`, `/auth/logout` | 🟡 (el registro no cubre los campos obligatorios nuevos: fecha de nacimiento, ciudad, género, correo secundario, tutor para 13–17 años) |
| Completar perfil (cuentas anteriores) | `POST /auth/completar-perfil` | ❌ |
| Editar nombre / detalles | `PATCH /auth/perfil`, `PATCH /auth/detalles` | ❌ (perfil actualmente solo lectura) |
| Avatar | `POST /auth/avatar` | ❌ (usar `expo-image-picker`) |
| Solicitar fecha de nacimiento | `POST /auth/fecha-nacimiento` | ❌ |
| Cambiar correo / contraseña | `PATCH /auth/correo`, `/auth/contrasena` | ❌ |
| Perfil público de otro usuario | `GET /perfiles/{id}` | ❌ |

### Voluntariados
| Funcionalidad | Endpoint(s) | Móvil |
|---|---|---|
| Listado + filtros + mapa | `/v1/mapa/voluntariados`, `/v1/mapa/lugares`, `/voluntariados/categorias` | ✅ |
| Detalle, cupo, imágenes | `/voluntariados/{id}` | ✅ (verificar materiales/símbolos y enlaces a Google Maps) |
| Crear/editar (organizador) | `/admin/voluntariados` (POST/PUT/PATCH/DELETE) | 🟡 (crear/editar sí; **eliminar** no verificado) |
| Panel del voluntariado (inscritos) | `/admin/voluntariados/{id}/dashboard` | ✅ |
| Aprobar / rechazar | `/admin/voluntariados/{id}/aprobar|rechazar` | ✅ |
| **Comentarios** (preguntas públicas/privadas, respuestas, moderación, config) | `/voluntariados/{id}/comentarios`, `/comentarios/{id}/responder|visibilidad|publicar`, `DELETE`, `/voluntariados/{id}/config-comentarios` | ❌ |

### Inscripciones
| Funcionalidad | Endpoint(s) | Móvil |
|---|---|---|
| Inscribirse / ver / cancelar | `/inscripciones*` | ✅ |
| Actualizar / eliminar inscripción (admin/organizador) | `PUT/PATCH/DELETE /inscripciones/{id}` | ❌ |

### Asistencia
| Funcionalidad | Endpoint(s) | Móvil |
|---|---|---|
| Escaneo QR / registrar asistencia | `POST /asistencias` | ✅ (`expo-camera`) |
| Código de asistencia del organizador (QR) | `PATCH /admin/voluntariados/{id}/codigo-asistencia` | ✅ |
| Listado/detalle/eliminar asistencias | `GET/DELETE /asistencias*` | 🟡 |
| **Solicitudes de corrección** de asistencia | `POST /asistencias/solicitudes`, `PATCH .../{id}/responder` | ❌ |

### Impacto ambiental
| Funcionalidad | Endpoint(s) | Móvil |
|---|---|---|
| Resumen global, por voluntariado, reporte | `/impactos/resumen`, `/voluntariados/{id}/impactos`, `POST /admin/voluntariados/{id}/impactos` | ✅ |
| Bitácora de impacto (admin / organizador) | `/admin/bitacora-impacto`, `/organizador/bitacora-impacto` | ❌ |

### Flora y fauna, lugares y artículos
| Funcionalidad | Endpoint(s) | Móvil |
|---|---|---|
| Catálogo y detalle de flora/fauna | `GET /flora-fauna[/{id}]` | ✅ |
| Crear/editar flora y fauna | `POST/PUT /flora-fauna` | ❌ |
| Publicar/archivar flora-fauna y lugares (admin) | `/admin/flora-fauna/*`, `/admin/lugares/*` | ✅ (en moderación) |
| Crear/editar lugares | `POST/PUT /lugares` | ❌ (solo se listan para elegir en el editor) |
| Lectura de artículos | `GET /articulos[/{id}]` | ✅ |
| Crear/editar artículo, enviar a revisión | `POST/PUT /articulos`, `PATCH /articulos/{id}/enviar-revision` | ❌ |
| Moderar artículos (aprobar, rechazar, despublicar, eliminar) | `/admin/articulos/*` | 🟡 (aprobar/rechazar sí; despublicar/eliminar no) |

### Gamificación y aprendizaje (**módulo completo ausente en móvil**)
| Funcionalidad | Endpoint(s) | Móvil |
|---|---|---|
| Cuestionarios, intentos, respuestas, progreso (puntos, nivel, medallas) | `GET /cuestionarios`, `POST /cuestionarios/{slug}/intentos`, `POST /cuestionarios/intentos/{id}/respuestas`, `GET /gamificacion/progreso` | ❌ |
| Admin: CRUD cuestionarios y medallas, estadísticas, detalle de intento | `/admin/cuestionarios`, `/admin/medallas`, `/admin/gamificacion/estadisticas`, `/admin/gamification/intentos/{id}` | ❌ |

La web lo expone en `/aprendizaje`, `/admin/cuestionarios`, `/admin/medallas` y en el dashboard del voluntario.

### Notificaciones
| Funcionalidad | Endpoint(s) | Móvil |
|---|---|---|
| Bandeja, marcar leída, marcar todas | `/notificaciones`, `/{id}/leida`, `/marcar-todas-leidas` | ✅ |
| Contador de no leídas (badge) | `/notificaciones/no-leidas` | ❌ |
| Eliminar notificación | `DELETE /notificaciones/{id}` | ❌ |
| Preferencias de recordatorios | `GET/PATCH /notificaciones/preferencias` | ❌ |
| **Push nativo** | Hoy la API solo guarda suscripciones Web Push (VAPID) | ❌ — requiere endpoint nuevo en la API para tokens de Expo (`expo-notifications`) y envío vía Expo Push |

### Administración
| Funcionalidad | Endpoint(s) | Móvil |
|---|---|---|
| Usuarios (listar, crear, editar, eliminar) | `/admin/usuarios*` | ✅ (verificar eliminar) |
| Revisión de fecha de nacimiento | `PATCH /admin/usuarios/{id}/fecha-nacimiento` | ❌ |
| Auditoría | `/admin/auditoria[/{id}]` | ✅ |
| Moderación de voluntariados / artículos / flora / lugares | ver arriba | 🟡 |

### Otros
| Funcionalidad | Endpoint(s) | Móvil |
|---|---|---|
| Home / inicio con métricas | web `/` | 🟡 (`(tabs)/index`) |
| Imágenes servidas por GridFS | `GET /imagen/{path}` | ✅ (URLs de la API) |
| Modo oscuro / claro | — | ✅ (`useColorScheme`) |

## 5. Pendientes de infraestructura móvil

- [ ] **Generar APK** (ver sección 7): falta `eas.json`, `android.package` y `ios.bundleIdentifier` en `app.json`.
- [ ] Renombrar `name`/`slug`/`scheme` (hoy `voluntariado-mvp`) a "Regenera".
- [ ] Quitar `"web": { "output": "server" }` o dejarlo solo para desarrollo (no es target de despliegue).
- [ ] API en **HTTPS** accesible públicamente: Android 9+ bloquea HTTP en builds de release (o habilitar `usesCleartextTraffic` mediante `expo-build-properties`, solo para pruebas).
- [ ] Google Maps API key para `react-native-maps` en Android (`android.config.googleMaps.apiKey`), sin subirla al repo.
- [ ] Permisos: ubicación y cámara ya configurados; añadir galería (`expo-image-picker`) si se implementa avatar/imágenes.
- [ ] `expo-notifications` + proyecto EAS/FCM para push nativo.
- [ ] Pantalla de **onboarding/completar perfil** y validación de edad para cuentas nuevas.
- [ ] Manejo offline/errores de red y estados vacíos consistentes; pull-to-refresh.
- [ ] Revisar `.gitignore` (ya ignora `.env` y credenciales `*.jks`).

## 6. Plan sugerido (orden de prioridad)

1. **Fase 0 – Build**: configurar `app.json`, `eas.json` y generar el primer APK contra la API real.
2. **Fase 1 – Cuenta**: registro con campos nuevos, completar perfil, editar perfil/avatar, cambiar correo/contraseña.
3. **Fase 2 – Gamificación**: cuestionarios, progreso, medallas (voluntario). Es el mayor hueco funcional.
4. **Fase 3 – Comentarios** en el detalle de voluntariado (voluntario + moderación organizador/admin).
5. **Fase 4 – Notificaciones**: badge, preferencias, eliminar, push nativo (requiere cambio en API).
6. **Fase 5 – Contenido**: crear/editar artículos, flora-fauna y lugares; despublicar/eliminar artículos.
7. **Fase 6 – Asistencia avanzada**: solicitudes de corrección, historial; bitácora de impacto.
8. **Fase 7 – Admin extra**: cuestionarios/medallas/estadísticas, revisión de fecha de nacimiento.

## 7. Cómo exportar a APK instalable

Requiere cuenta gratuita de Expo y la API accesible por HTTPS.

```bash
npm install -g eas-cli      # o: npx eas-cli@latest <comando>
eas login
eas build:configure         # crea eas.json
```

Perfil para APK instalable en `eas.json`:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": { "EXPO_PUBLIC_REGENERA_API_URL": "https://TU-DOMINIO" }
    }
  }
}
```

```bash
eas build -p android --profile preview
```

EAS entrega un enlace de descarga del `.apk`. Antes, define en `app.json` → `expo.android.package` (p. ej. `mx.regenera.app`). Para producción en Play Store usar `"buildType": "app-bundle"`.

Alternativa local (requiere Android Studio/SDK): `npx expo prebuild -p android` y `cd android && ./gradlew assembleRelease` (los directorios nativos se generan, no se editan a mano).

> Nota: `react-native-maps`, `expo-camera` y `expo-secure-store` funcionan en build nativa; Expo Go es solo para desarrollo rápido.

## 8. Comandos útiles

```bash
npx expo start         # desarrollo
npm test               # pruebas
npx expo lint
npx tsc --noEmit
npx expo-doctor
```
