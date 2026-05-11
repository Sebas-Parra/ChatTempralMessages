# Tempral Chat

Aplicacion de chat temporal construida con React, TypeScript, Vite, Flask y Socket.IO. Los mensajes se envian en tiempo real y se eliminan automaticamente despues de un tiempo definido por el servidor.

## Requisitos

- Node.js 20 o superior
- npm
- Python 3
- pip

## Instalacion del proyecto

### 1. Clonar o abrir el proyecto

Ubicate en la carpeta principal del proyecto:

```bash
cd "ChatTempral"
```

### 2. Instalar el backend

Desde la carpeta principal, crea y activa un entorno virtual:

```bash
python3 -m venv venv
source venv/bin/activate
```

Instala las dependencias necesarias del servidor:

```bash
pip install flask flask-socketio flask-cors
```

Inicia el servidor:

```bash
python server.py
```

El backend se ejecutara en:

```text
http://localhost:5000
```

### 3. Instalar el frontend

En otra terminal, entra a la carpeta del frontend:

```bash
cd "Tempral Chat"
```

Instala las dependencias de Node:

```bash
npm install
```

Inicia la aplicacion en modo desarrollo:

```bash
npm run dev
```

Vite mostrara la URL local para abrir la aplicacion, normalmente:

```text
http://localhost:5173
```

## Scripts disponibles

Dentro de la carpeta `Tempral Chat` puedes ejecutar:

```bash
npm run dev
```

Levanta el servidor de desarrollo.

```bash
npm run build
```

Genera la version de produccion.

```bash
npm run preview
```

Permite revisar localmente la version compilada.

```bash
npm run lint
```

Ejecuta ESLint para revisar el codigo.

## Uso

1. Inicia primero el backend con `python server.py`.
2. Inicia el frontend con `npm run dev`.
3. Abre la URL de Vite en el navegador.
4. Ingresa un nombre de usuario.
5. Envia mensajes temporales en el chat.
