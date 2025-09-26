# 🎓 Quartz - Sistema de Gestión de Cursos

Quartz es una aplicación web que permite gestionar cursos integrados con Google Classroom, organizar estudiantes en células de aprendizaje y realizar un seguimiento del progreso académico.

## 🚀 Stack Tecnológico

- **Frontend**: Nuxt 3 + Vue 3 + TypeScript
- **UI**: NuxtUI (Tailwind CSS)
- **Backend**: Nitro (server-side rendering)
- **Base de Datos**: SurrealDB
- **Autenticación**: Google OAuth2
- **APIs**: Google Classroom API

## 📋 Prerrequisitos

Antes de ejecutar el proyecto localmente, asegúrate de tener instalado:

1. **Node.js** (versión 18.x o superior)
2. **Bun** (recomendado) o npm/pnpm/yarn
3. **SurrealDB** (base de datos)
4. **Cuenta de Google Cloud Platform** para acceder a Google Classroom API

## ⚙️ Configuración Inicial

### 1. Instalar Dependencias

```bash
# Con Bun (recomendado)
bun install

# O con otros gestores
npm install
pnpm install
yarn install
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Google OAuth2 Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URI=http://localhost:3000/

# SurrealDB Configuration
SURREAL_DB_URL=ws://localhost:8000/rpc
SURREAL_DB_NS=quartz
SURREAL_DB_DB=main
SURREAL_DB_USER=root
SURREAL_DB_PASS=root
```

### 3. Configurar Google Cloud Platform

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita las siguientes APIs:
   - Google Classroom API
   - Google People API
4. Crea credenciales OAuth 2.0:
   - Tipo: Aplicación web
   - URIs de redirección autorizados: `http://localhost:3000/api/auth/callback/google`
5. Copia `Client ID` y `Client Secret` a tu archivo `.env`

### 4. Configurar SurrealDB

Instala y ejecuta SurrealDB:

```bash
# Instalar SurrealDB
curl --proto '=https' --tlsv1.2 -sSf https://install.surrealdb.com | sh

# Ejecutar SurrealDB en modo desarrollo
surreal start --log trace --user root --pass root rocksdb://quartz_db
```

## 🏃‍♂️ Ejecutar en Desarrollo

### 1. Iniciar SurrealDB

```bash
surreal start --log trace --user root --pass root rocksdb://quartz_db
```

### 2. Iniciar el Servidor de Desarrollo

```bash
# Con Bun
bun run dev

# Con otros gestores
npm run dev
pnpm dev
yarn dev
```

El servidor se iniciará en `http://localhost:3000`

## 🔐 Primer Uso

1. **Accede a** `http://localhost:3000`
2. **Inicia sesión** con tu cuenta de Google (debe tener acceso a Google Classroom)
3. **Autoriza los permisos** para acceder a tus cursos de Classroom
4. **Configura tus cursos** desde el dashboard principal

## 📁 Estructura del Proyecto

```text
quartz/
├── app/                    # Aplicación Nuxt
│   ├── components/         # Componentes Vue reutilizables
│   ├── composables/        # Composables de Vue
│   ├── pages/             # Páginas de la aplicación
│   └── assets/            # Assets estáticos
├── server/                # Servidor Nitro
│   ├── api/               # Endpoints de API
│   ├── middleware/        # Middleware del servidor
│   └── utils/             # Utilidades del servidor
├── shared/                # Tipos compartidos
│   └── types/             # Definiciones de TypeScript
└── public/                # Archivos públicos estáticos
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo
bun run dev              # Inicia el servidor de desarrollo

# Construcción
bun run build            # Construye para producción
bun run preview          # Vista previa de la construcción

# Linting
bun run lint             # Ejecuta ESLint
bun run lint:fix         # Arregla problemas de linting

# Tipos
bun run typecheck        # Verifica tipos de TypeScript
```

## 📚 Funcionalidades Principales

- ✅ **Autenticación con Google OAuth2**
- ✅ **Sincronización con Google Classroom**
- ✅ **Gestión de cursos y estudiantes**
- ✅ **Organización en células de aprendizaje**
- ✅ **Vista de estudiante con tareas y calificaciones**
- ✅ **Dashboard para profesores y coordinadores**
- ✅ **Interfaz responsive con NuxtUI**

## 🆘 Solución de Problemas

### Error de Conexión a SurrealDB

```bash
# Verifica que SurrealDB esté ejecutándose
surreal start --log trace --user root --pass root memory
```

### Error de Google OAuth

- Verifica que las credenciales en `.env` sean correctas
- Asegúrate de que la URI de redirección esté configurada en Google Cloud Console

### Error de Permisos de Google Classroom

- Verifica que tu cuenta tenga acceso a Google Classroom
- Asegúrate de que las APIs estén habilitadas en Google Cloud Platform

## 📖 Documentación Adicional

- [Nuxt 3 Documentation](https://nuxt.com/docs)
- [NuxtUI Documentation](https://ui.nuxt.com/)
- [SurrealDB Documentation](https://surrealdb.com/docs)
- [Google Classroom API](https://developers.google.com/classroom)
