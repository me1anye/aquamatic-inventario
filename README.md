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
- Conectada con Firebase: guarda un historial de todos los inventarios y muestra, mientras cuentas, cuánto había del producto en el último inventario registrado (para comparar).
- Guarda el progreso automáticamente en el celular (localStorage) por si se cierra la página a medio conteo.

