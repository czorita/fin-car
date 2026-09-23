# Fin-Car 🚗

Aplicación web para comparar y analizar el coste financiero real de ofertas de vehículos (al contado vs financiado).

---

## ✨ Características Principales

- **Web de ejemplos precargados (`/ejemplos.html`):** Incluye 5 casos de estudio de concesionario listos para analizar o copiar a tus ofertas.
- **Persistencia en documentos JSON y volúmenes Docker:** Cada oferta se guarda como un archivo `.json` estructurado e individual en el volumen montado (`./data:/app/data`).

---

## 🚀 Inicio Rápido (Desarrollo Local)

> **Requisito:** Node.js **22 o superior** (definido en `engines` de `package.json`; es la versión usada en CI y en la imagen Docker).

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo (Vite)
npm run dev

# 3. Ejecutar tests unitarios
npm test
```

Acceso: [http://localhost:8080](http://localhost:8080) (y [http://localhost:8080/ejemplos.html](http://localhost:8080/ejemplos.html))

### Scripts disponibles

| Script                  | Descripción                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `npm run dev`           | Servidor de desarrollo Vite (con la API local en `/api`).                               |
| `npm run build`         | Genera el bundle de producción en `dist/`.                                              |
| `npm start`             | Arranca el servidor Node nativo (`server.js`) sirviendo `dist/` y la API.               |
| `npm test`              | Ejecuta los tests con `node --test` (lógica, servidor e interfaz con happy-dom).        |
| `npm run test:coverage` | Ejecuta los tests con el informe de cobertura de Node (`--experimental-test-coverage`). |
| `npm run lint`          | Analiza el código con ESLint (`eslint.config.js`).                                      |
| `npm run format`        | Formatea el código con Prettier (`.prettierrc.json`).                                   |
| `npm run format:check`  | Comprueba el formato con Prettier sin modificar archivos.                               |
| `npm run typecheck`     | Comprueba los tipos JSDoc con TypeScript (`jsconfig.json`: core, servicios y servidor). |

### Variables de entorno (`server.js`)

| Variable   | Por defecto                                | Descripción                             |
| ---------- | ------------------------------------------ | --------------------------------------- |
| `PORT`     | `8080` (`80` en la imagen Docker)          | Puerto HTTP del servidor.               |
| `DATA_DIR` | `./data` (`/app/data` en la imagen Docker) | Directorio con `examples/` y `offers/`. |

> Las ofertas guardadas en `data/offers/` son datos de usuario y no se versionan en Git (solo se conserva `data/offers/.gitkeep`).

---

## ✅ Integración Continua

El workflow `CI` (`.github/workflows/ci.yml`) se ejecuta en cada _push_ a cualquier rama y en cada _pull request_, con Node.js 22:

1. `npm ci`
2. `npm run lint`
3. `npm run format:check`
4. `npm run typecheck`
5. `npm test`
6. `npm run build`

---

## 🐳 Docker (Entorno de Producción)

### Opción A: Con Docker Compose (Recomendado con Volumen Persistente)

El archivo `docker-compose.yml` monta el directorio `./data` en `/app/data`, persistiendo todas las ofertas que guardes en archivos JSON:

```bash
# Construir y arrancar localmente
docker compose up -d --build

# Parar la aplicación
docker compose down
```

Acceso: [http://localhost:8080](http://localhost:8080) (y [http://localhost:8080/ejemplos.html](http://localhost:8080/ejemplos.html))

### Estructura del Volumen `./data`:

```text
data/
├── examples/       # 5 documentos JSON de ejemplo precargados
└── offers/         # Documentos JSON guardados por el usuario
```

### Opción B: Con Docker CLI

```bash
# 1. Construir la imagen
docker build -t fin-car:latest .

# 2. Arrancar el contenedor montando el volumen
docker run -d -p 8080:80 -v $(pwd)/data:/app/data --name fin-car-app fin-car:latest
```

La imagen (basada en `node:22-alpine`) incluye un `HEALTHCHECK` que consulta `/api/examples`; puedes ver su estado con `docker ps`.

---

## 📦 Arranque desde GitHub Packages (GHCR)

Las imágenes publicadas en GitHub Packages son multi-arquitectura (**`linux/amd64`** y **`linux/arm64`**), compatibles de forma nativa con Intel/AMD, Apple Silicon (M1/M2/M3/M4) y Raspberry Pi / ARM64.

Para ejecutar la imagen preconstruida sin compilar código:

```bash
DOCKER_IMAGE=ghcr.io/<usuario>/fin-car:latest docker compose up -d
```

> **Nota para versiones antiguas solo-amd64 en máquinas ARM64:** Si necesitas ejecutar una versión antigua publicada previamente que no dispusiera de manifiesto ARM64, puedes forzar la emulación x86 añadiendo `--platform linux/amd64` en el comando `docker run` o `platform: linux/amd64` en tu servicio de Docker Compose.

---

## 🏷️ Publicar Nueva Versión (CI/CD)

El workflow de GitHub Actions (`Release & Publish Docker Image`) automatiza todo el ciclo de entrega:

### Ejecución manual (Recomendado)

Desde la pestaña **Actions** de GitHub, selecciona el workflow y pulsa **Run workflow**:

- **Versión automática:** Si dejas el campo de versión vacío, el workflow leerá la versión actual definida en `package.json`.
- **Versión manual:** Si indicas una versión (ej: `1.0.0`), el workflow sincronizará `package.json` con dicho valor.

### ¿Qué hace el workflow automáticamente?

1. Construye el bundle y pasa los tests unitarios (`npm run build` y `npm test`).
2. Genera el tag de Git (sin prefijo `v`, ej: `1.0.0`).
3. Construye y publica la imagen Docker multi-arquitectura (`linux/amd64,linux/arm64` mediante Docker Buildx y QEMU) en GHCR etiquetada con la versión y `latest`.
4. Crea la **GitHub Release** oficial incluyendo en su descripción la versión y la ruta de la imagen Docker generada (con comandos rápidos para Docker CLI y Compose), además de las notas de cambios automáticas.
5. **Incrementa automáticamente el _patch_** en `package.json` (`npm version patch`) y realiza un commit en la rama con la nueva versión para el siguiente ciclo de desarrollo.
