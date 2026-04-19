# Despliegue — Vercel + Supabase

## Paso 1: Crear base de datos en Supabase

1. Ve a [supabase.com](https://supabase.com) → tu organización → **New project**
2. Ponle un nombre (ej: `finanzasapp`) y elige una región (South America)
3. Espera ~2 minutos a que inicialice
4. Ve a **SQL Editor** → **New query**
5. Pega todo el contenido de `supabase/schema.sql` y ejecuta (▶ Run)

---

## Paso 2: Obtener las credenciales de Supabase

En tu proyecto Supabase:
- **Settings** → **Database** → **Connection string**
- Selecciona **"Transaction pooler"** (para Vercel serverless)
- Copia la URI — se ve así:
  ```
  postgresql://postgres.xxxx:[password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
  ```

---

## Paso 3: Desplegar en Vercel

### Opción A — Desde la web de Vercel (más fácil)
1. Ve a [vercel.com](https://vercel.com) → **Add New Project**
2. Importa el repositorio `appcontrolgastos` desde GitHub
3. Vercel detecta el `vercel.json` automáticamente
4. Antes de hacer deploy, agrega las **Environment Variables**:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | La URI de Supabase (Transaction pooler) |
| `JWT_SECRET` | String aleatorio largo (ej: resultado de `openssl rand -hex 32`) |
| `JWT_REFRESH_SECRET` | Otro string aleatorio |
| `NODE_ENV` | `production` |

5. Click **Deploy** ✅

### Opción B — Desde la terminal (si tienes Vercel CLI)
```bash
# Instalar CLI
npm i -g vercel

# Login
vercel login

# Desde la carpeta del proyecto
cd /ruta/a/Appcontrolgastos
vercel

# Agregar variables de entorno
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add JWT_REFRESH_SECRET
vercel env add NODE_ENV

# Deploy a producción
vercel --prod
```

---

## Paso 4: Instalar en iPhone SE (Safari)

1. Abre **Safari** en tu iPhone (no Chrome ni Edge)
2. Ve a la URL de tu app en Vercel (ej: `https://finanzasapp.vercel.app`)
3. Toca el botón compartir **↑** (barra inferior, centro)
4. Busca y toca **"Agregar a pantalla de inicio"**
5. Confirma con **"Agregar"**

La app queda instalada como ícono nativo en tu pantalla de inicio. Se abre en pantalla completa, sin barra del navegador.

---

## Desarrollo local

```bash
# Copiar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL de Supabase

# Instalar dependencias
npm install

# Iniciar desarrollo (backend + frontend en paralelo)
npm run dev
# Backend: http://localhost:3001
# Frontend: http://localhost:5173
```

---

## Actualizar después de cambios

Con Vercel conectado a GitHub, cada `git push` a `main` hace deploy automáticamente.

O manualmente:
```bash
vercel --prod
```
