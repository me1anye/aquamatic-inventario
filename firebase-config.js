// ============================================================
// CONFIGURACIÓN DE FIREBASE
// ============================================================
// 1. Ve a https://console.firebase.google.com
// 2. Crea un proyecto nuevo (gratis) — puedes llamarlo "aquamatic-inventario"
// 3. Dentro del proyecto, agrega una app "Web" (ícono </>)
// 4. Firebase te va a dar un objeto de configuración parecido a este,
//    pero con tus propias claves. Copia y pega TODO ese objeto aquí abajo,
//    reemplazando el que dice "PEGA_AQUI_TU_...".
// 5. En el menú lateral de Firebase, activa "Firestore Database"
//    (modo producción está bien) para que el historial funcione.
//
// Mientras no pongas tus claves reales, la app sigue funcionando
// (conteo, PDF, etc.) pero SIN historial en la nube ni comparación
// entre turnos — solo se guarda localmente en cada celular.
// ============================================================

const firebaseConfig = {
  apiKey: "PEGA_AQUI_TU_API_KEY",
  authDomain: "PEGA_AQUI_TU_PROYECTO.firebaseapp.com",
  projectId: "PEGA_AQUI_TU_PROYECTO_ID",
  storageBucket: "PEGA_AQUI_TU_PROYECTO.appspot.com",
  messagingSenderId: "PEGA_AQUI_TU_SENDER_ID",
  appId: "PEGA_AQUI_TU_APP_ID",
};

const FIREBASE_CONFIGURADO = !firebaseConfig.apiKey.startsWith("PEGA_AQUI");
