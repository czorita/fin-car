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

Crear y subir un tag dispara automáticamente la GitHub Action que actualiza `package.json`, pasa los tests y publica la imagen en GHCR con la etiqueta de la versión y `latest`:

```bash
git tag v1.0.0
git push origin v1.0.0
```
