# Despliegue en Railway

## Paso a paso

### 1. Crear cuenta en Railway
Ve a https://railway.app y regístrate con GitHub.

### 2. Nuevo proyecto desde GitHub
- Click "New Project" → "Deploy from GitHub repo"
- Selecciona el repositorio `appcontrolgastos`
- Railway detecta el `railway.json` automáticamente

### 3. Variables de entorno (obligatorio)
En el panel de Railway → Settings → Variables, agrega:

```
JWT_SECRET=<genera_un_string_aleatorio_largo>
JWT_REFRESH_SECRET=<otro_string_aleatorio_largo>
NODE_ENV=production
PORT=3001
DB_PATH=/data/gastos.db
```

Para generar los secrets: https://generate-secret.vercel.app/64

### 4. Volumen persistente para SQLite
- En Railway → tu servicio → Volumes
- Click "Add Volume"
- Mount path: `/data`
- Esto guarda la base de datos entre deploys

### 5. Dominio público
- Railway → Settings → Networking → "Generate Domain"
- Obtienes una URL tipo: `https://appcontrolgastos-production.up.railway.app`

### 6. Instalar en iPhone SE
1. Abre Safari en tu iPhone (debe ser Safari, no Chrome)
2. Ve a la URL de Railway
3. Toca el botón compartir (cuadrado con flecha ↑)
4. Selecciona "Agregar a pantalla de inicio"
5. Confirma el nombre → "Agregar"

La app queda instalada como ícono en tu pantalla de inicio.

## Costos
Railway tiene un plan gratuito (Hobby) con $5 USD de crédito mensual.
Una app pequeña consume ~$1-2 USD/mes → esencialmente gratuito.
