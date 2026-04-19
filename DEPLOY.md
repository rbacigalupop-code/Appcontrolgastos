# Despliegue — FinanzasApp

## Opción 1: Fly.io (Recomendado — Gratis)

### ¿Por qué Fly.io?
- Plan gratuito real (3 VMs + 3GB de volúmenes sin costo)
- Pide tarjeta de crédito pero **no cobra** en free tier
- Sin cold starts (siempre encendida)
- Servidor en Santiago (scl) — más rápido desde Chile

### Paso a paso

#### 1. Instalar flyctl (CLI de Fly.io)
```bash
# Mac
brew install flyctl

# Linux / WSL
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

#### 2. Crear cuenta y login
```bash
fly auth signup
# Se abre el navegador para crear cuenta
```

#### 3. Crear la app (solo la primera vez)
```bash
cd /ruta/a/Appcontrolgastos
fly apps create finanzasapp
```
> Si "finanzasapp" ya existe, cambia el nombre en `fly.toml` (línea `name`)

#### 4. Crear volumen persistente para SQLite
```bash
fly volumes create finanzasapp_data --region scl --size 1
```
> Esto crea 1GB de disco persistente en Santiago. Gratis en free tier.

#### 5. Configurar las variables de entorno (secrets)
```bash
# Genera strings aleatorios para los secrets:
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
fly secrets set JWT_REFRESH_SECRET=$(openssl rand -hex 32)
```

#### 6. Desplegar
```bash
fly deploy
```
> El primer deploy tarda ~3-5 minutos (compila todo). Los siguientes son más rápidos.

#### 7. Abrir la app
```bash
fly open
# Abre automáticamente la URL en el navegador
```

Tu URL será algo como: `https://finanzasapp.fly.dev`

---

### Instalar en iPhone SE (Safari)
1. Abre **Safari** (NO Chrome ni Firefox) en tu iPhone
2. Ve a `https://finanzasapp.fly.dev`
3. Toca el botón compartir **↑** (abajo en el centro)
4. Desplaza hacia abajo → **"Agregar a pantalla de inicio"**
5. Toca **"Agregar"**

La app queda instalada como ícono. Se abre en pantalla completa, sin barra del navegador, igual que una app nativa.

---

### Actualizar la app después de cambios
```bash
fly deploy
# Solo esto — Fly.io hace el build y deploy automáticamente
```

### Ver logs en tiempo real
```bash
fly logs
```

### Ver estado
```bash
fly status
```

---

## Opción 2: Railway ($5/mes después del trial)
Ver instrucciones en el archivo `railway.json`.

---

## Opción 3: Local en la misma WiFi (sin internet)
```bash
# En el computador:
npm run dev

# En el teléfono (misma WiFi):
# Abrir http://<IP-del-computador>:5173
# Para ver la IP: ip addr show (Linux) o ipconfig (Windows)
```
