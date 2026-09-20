# Fin-Car 🚗

Aplicación web para comparar y analizar el coste financiero real de ofertas de vehículos (al contado vs financiado).

---

## ✨ Características Principales

- **Web de ejemplos precargados (`/ejemplos.html`):** Incluye 3 casos de estudio de concesionario listos para analizar o copiar a tus ofertas.
- **Persistencia en documentos JSON y volúmenes Docker:** Cada oferta se guarda como un archivo `.json` estructurado e individual en el volumen montado (`./data:/app/data`).

---

## 🚀 Inicio Rápido (Desarrollo Local)

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo (Vite)
npm run dev

# 3. Ejecutar tests unitarios
npm test
```
Acceso: [http://localhost:8080](http://localhost:8080) (y [http://localhost:8080/ejemplos.html](http://localhost:8080/ejemplos.html))

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
├── examples/       # 3 documentos JSON de ejemplo precargados
└── offers/         # Documentos JSON guardados por el usuario
```

### Opción B: Con Docker CLI

```bash
# 1. Construir la imagen
docker build -t fin-car:latest .

# 2. Arrancar el contenedor montando el volumen
docker run -d -p 8080:80 -v $(pwd)/data:/app/data --name fin-car-app fin-car:latest
```

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
1. Pasa los tests unitarios (`npm test`).
2. Genera el tag de Git (sin prefijo `v`, ej: `1.0.0`).
3. Construye y publica la imagen Docker multi-arquitectura (`linux/amd64,linux/arm64` mediante Docker Buildx y QEMU) en GHCR etiquetada con la versión y `latest`.
4. Crea la **GitHub Release** oficial incluyendo en su descripción la versión y la ruta de la imagen Docker generada (con comandos rápidos para Docker CLI y Compose), además de las notas de cambios automáticas.
5. **Incrementa automáticamente el *patch*** en `package.json` (`npm version patch`) y realiza un commit en la rama con la nueva versión para el siguiente ciclo de desarrollo.
