# Car Compare 🚗

Aplicación web para comparar y analizar el coste financiero real de ofertas de vehículos (al contado vs financiado).

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
Acceso: [http://localhost:5173](http://localhost:5173)

---

## 🐳 Docker (Entorno de Producción)

### Opción A: Con Docker Compose (Recomendado)

```bash
# Construir y arrancar localmente
docker compose up -d --build

# Parar la aplicación
docker compose down
```
Acceso: [http://localhost:8080](http://localhost:8080)

### Opción B: Con Docker CLI

```bash
# 1. Construir la imagen
docker build -t car-compare:latest .

# 2. Arrancar el contenedor
docker run -d -p 8080:80 --name car-compare-app car-compare:latest
```

---

## 📦 Arranque desde GitHub Packages (GHCR)

Para ejecutar la imagen preconstruida sin compilar código:

```bash
DOCKER_IMAGE=ghcr.io/<usuario>/car-compare:latest docker compose up -d
```

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
3. Crea la **GitHub Release** oficial con notas de cambios generadas automáticamente.
4. Construye y publica la imagen Docker en GHCR etiquetada con la versión y `latest`.
5. **Incrementa automáticamente el *minor*** en `package.json` (`npm version minor`) y realiza un commit en la rama con la nueva versión para el siguiente ciclo de desarrollo.
