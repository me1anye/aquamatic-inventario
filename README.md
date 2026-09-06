# Inventario Aquamatic

App web para hacer el inventario de la tienda desde el celular: cada quien captura sus conteos, el sistema suma solo, y al final se descarga un PDF listo para imprimir o mandar por WhatsApp.

## Qué hace

- Pide quién hace el conteo y de qué turno es.
- Muestra los productos agrupados por categoría (puedes buscar por nombre).
- Por cada producto puedes ir agregando cantidades de distintos estantes ("Agregar") y el sistema las va sumando solo.
- Marca "✓ Ya no hay más" cuando terminaste ese producto.
- Barra de progreso de cuántos productos llevas.
- Observaciones libres antes de cerrar el inventario.
- Al finalizar: descarga un PDF con el nombre Aquamatic, turno, responsable, fecha, tabla de producto/gramaje/total y observaciones.
- Si conectas Firebase (ver abajo): guarda un historial de todos los inventarios y muestra, mientras cuentas, cuánto había del producto en el último inventario registrado (para comparar).
- Guarda tu progreso automáticamente en el celular (localStorage) por si se cierra la página a medio conteo.

## 1. Publicarla en GitHub Pages (gratis)

1. Crea un repositorio nuevo en GitHub (puede ser privado o público), por ejemplo `aquamatic-inventario`.
2. Sube estos archivos tal cual están: `index.html`, `style.css`, `app.js`, `products.js`, `firebase-config.js`.
3. Ve a **Settings → Pages** dentro del repositorio.
4. En "Source" selecciona la rama `main` y carpeta `/ (root)`. Guarda.
5. Espera 1-2 minutos y GitHub te va a dar un link tipo:
   `https://tu-usuario.github.io/aquamatic-inventario/`
6. Ese es el link que le mandas a tus compañeros. Pueden guardarlo en la pantalla de inicio de su celular para que se sienta como una app.

## 2. Conectar Firebase (para historial y comparación entre turnos)

Esto es opcional — la app funciona sin esto, solo que sin historial en la nube. Son 5 minutos:

1. Entra a https://console.firebase.google.com y crea un proyecto (gratis).
2. Dentro del proyecto: botón **Agregar app → Web** (ícono `</>`). Ponle cualquier nombre.
3. Firebase te muestra un bloque de código con `const firebaseConfig = {...}`. Copia esos valores.
4. Abre el archivo `firebase-config.js` de este proyecto y pega tus valores reemplazando los que dicen `PEGA_AQUI_TU_...`.
5. En el menú lateral de Firebase entra a **Firestore Database → Crear base de datos**. Elige modo "producción" y la región más cercana (ej. `us-central`).
6. Dentro de Firestore, pestaña **Reglas**, y pega esto para que solo tus compañeros con el link puedan leer/escribir (sin necesitar contraseñas, ya que es un uso interno):

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```

   Nota: esto deja la base de datos abierta a quien tenga la URL exacta de tu proyecto Firebase (no la de tu página). Para un inventario interno de una tienda es un riesgo bajo, pero si más adelante quieres reforzarlo, se puede agregar una contraseña compartida fácilmente — solo dímelo.

7. Sube de nuevo (o edita directo en GitHub) el archivo `firebase-config.js` con tus datos reales, haz commit, y espera 1-2 minutos a que GitHub Pages actualice.

## 3. Agregar los 3 productos que faltaron (40, 41, 42)

Abre `products.js`, busca la categoría donde correspondan, y agrega una línea como las demás, por ejemplo:

```js
{ id: "p40", nombre: "Nombre del producto", gramaje: "" },
```

## 4. Agregar o quitar productos en el futuro

También en `products.js`. Cada producto es una línea `{ id, nombre, gramaje }` dentro de su categoría. El `id` solo debe ser único (no repetir uno que ya exista).

## Notas técnicas

- No usa ningún framework: es HTML, CSS y JavaScript simple, para que sea fácil de mantener y no dependa de instalar nada.
- El PDF se genera en el propio celular con la librería jsPDF (no sube a ningún servidor).
- Todo funciona bien con conexión lenta o intermitente; solo Firebase (historial y comparación) necesita internet en el momento de finalizar.
