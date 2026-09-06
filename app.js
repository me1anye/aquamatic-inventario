// =====================================================================
// AQUAMATIC · INVENTARIO — lógica de la aplicación
// =====================================================================

const CLAVE_SESION = "aquamatic_sesion_actual";
const COL_INVENTARIOS = "inventarios";
const DOC_ULTIMO_CONTEO = "meta/ultimo_conteo";

let db = null;
if (typeof FIREBASE_CONFIGURADO !== "undefined" && FIREBASE_CONFIGURADO) {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
  } catch (e) {
    console.error("No se pudo inicializar Firebase:", e);
  }
} else {
  document.getElementById("banner-offline").hidden = false;
}

// ---------------------------------------------------------------------
// Estado de la sesión en curso
// ---------------------------------------------------------------------
function sesionVacia() {
  const productos = {};
  TODOS_LOS_PRODUCTOS.forEach((p) => {
    productos[p.id] = { conteos: [], total: 0, completado: false };
  });
  return {
    responsable: "",
    turno: "",
    fecha: fechaLegible(new Date()),
    observaciones: "",
    productos,
    referencias: {}, // último conteo conocido por producto, para comparar
  };
}

let sesion = sesionVacia();

function guardarSesion() {
  localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
}

function cargarSesionGuardada() {
  const cruda = localStorage.getItem(CLAVE_SESION);
  if (!cruda) return null;
  try {
    return JSON.parse(cruda);
  } catch {
    return null;
  }
}

function fechaLegible(d) {
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ---------------------------------------------------------------------
// Navegación entre pantallas
// ---------------------------------------------------------------------
function mostrarPantalla(id) {
  document.querySelectorAll(".pantalla").forEach((el) => el.classList.remove("activa"));
  document.getElementById(id).classList.add("activa");
  window.scrollTo(0, 0);
}

document.querySelectorAll("[data-volver]").forEach((btn) => {
  btn.addEventListener("click", () => mostrarPantalla(btn.dataset.volver));
});

// ---------------------------------------------------------------------
// Pantalla inicio
// ---------------------------------------------------------------------
document.getElementById("btn-comenzar").addEventListener("click", () => {
  const guardada = cargarSesionGuardada();
  if (guardada && guardada.responsable && Object.values(guardada.productos).some((p) => p.conteos.length > 0)) {
    const continuar = confirm(
      `Encontré un inventario sin terminar de "${guardada.responsable}" (turno ${guardada.turno}). ¿Quieres continuarlo? Cancelar para empezar uno nuevo.`
    );
    if (continuar) {
      sesion = guardada;
      document.getElementById("input-responsable").value = sesion.responsable;
      if (sesion.turno) {
        const radio = document.querySelector(`input[name="turno"][value="${sesion.turno}"]`);
        if (radio) radio.checked = true;
      }
    } else {
      sesion = sesionVacia();
      guardarSesion();
    }
  }
  document.getElementById("fecha-hoy").textContent = sesion.fecha || fechaLegible(new Date());
  mostrarPantalla("pantalla-datos");
});

document.getElementById("btn-historial").addEventListener("click", () => {
  mostrarPantalla("pantalla-historial-lista");
  cargarHistorial();
});

// ---------------------------------------------------------------------
// Pantalla datos
// ---------------------------------------------------------------------
document.getElementById("form-datos").addEventListener("submit", async (e) => {
  e.preventDefault();
  sesion.responsable = document.getElementById("input-responsable").value.trim();
  sesion.turno = document.querySelector('input[name="turno"]:checked').value;
  sesion.fecha = fechaLegible(new Date());
  guardarSesion();

  await cargarReferencias();
  renderizarProductos();
  actualizarProgreso();
  mostrarPantalla("pantalla-conteo");
});

// ---------------------------------------------------------------------
// Traer el último conteo registrado (para comparar en vivo)
// ---------------------------------------------------------------------
async function cargarReferencias() {
  if (!db) return;
  try {
    const snap = await db.doc(DOC_ULTIMO_CONTEO).get();
    if (snap.exists) {
      const data = snap.data();
      sesion.referencias = data.valores || {};
      sesion.referenciaInfo = { turno: data.turno, fecha: data.fecha };
    }
  } catch (e) {
    console.error("No se pudieron cargar las referencias:", e);
  }
}

// ---------------------------------------------------------------------
// Renderizar lista de productos por categoría
// ---------------------------------------------------------------------
function renderizarProductos() {
  const contenedor = document.getElementById("lista-categorias");
  contenedor.innerHTML = "";

  CATEGORIAS.forEach((cat, idx) => {
    const bloque = document.createElement("div");
    bloque.className = "categoria-bloque" + (idx === 0 ? " abierta" : "");
    bloque.dataset.categoria = cat.categoria;

    const completadosCat = cat.productos.filter((p) => sesion.productos[p.id].completado).length;

    bloque.innerHTML = `
      <button type="button" class="categoria-header" data-toggle-categoria>
        <span>${cat.categoria}</span>
        <span class="categoria-contador">${completadosCat}/${cat.productos.length}</span>
        <span class="categoria-flecha">›</span>
      </button>
      <div class="categoria-productos"></div>
    `;

    const listaProductos = bloque.querySelector(".categoria-productos");
    cat.productos.forEach((p) => {
      listaProductos.appendChild(crearFilaProducto(p));
    });

    contenedor.appendChild(bloque);
  });

  contenedor.querySelectorAll("[data-toggle-categoria]").forEach((header) => {
    header.addEventListener("click", () => {
      header.closest(".categoria-bloque").classList.toggle("abierta");
    });
  });
}

function crearFilaProducto(p) {
  const estado = sesion.productos[p.id];
  const fila = document.createElement("div");
  fila.className = "producto-fila" + (estado.completado ? " completado" : "");
  fila.dataset.productoId = p.id;
  fila.dataset.nombreBusqueda = (p.nombre + " " + p.gramaje).toLowerCase();

  const referencia = sesion.referencias ? sesion.referencias[p.id] : undefined;
  const refHtml = referencia !== undefined ? `<span class="producto-referencia">Último: ${referencia}</span>` : "";

  fila.innerHTML = `
    <div class="producto-cabecera">
      <div>
        <span class="producto-nombre">${p.nombre}</span>
        ${p.gramaje ? `<span class="producto-gramaje"> · ${p.gramaje}</span>` : ""}
      </div>
      ${refHtml}
    </div>
    <div class="producto-controles">
      <input type="number" inputmode="numeric" min="0" class="producto-input" placeholder="0" data-input-cantidad />
      <button type="button" class="btn-agregar" data-accion="agregar">Agregar</button>
      <div>
        <span class="producto-total-label">Total</span>
        <span class="producto-total" data-total>${estado.total}</span>
      </div>
    </div>
    <div class="conteos-detalle" data-detalle>${estado.conteos.length ? estado.conteos.join(" + ") : ""}</div>
    <div class="producto-acciones-secundarias">
      <button type="button" class="btn-finalizar-producto" data-accion="finalizar">✓ Ya no hay más</button>
      <button type="button" class="btn-editar-producto" data-accion="editar">Editar</button>
      <button type="button" class="btn-deshacer" data-accion="deshacer" ${estado.conteos.length ? "" : "hidden"}>Deshacer último</button>
      <span class="producto-badge-check">✓ Contado</span>
    </div>
  `;

  const input = fila.querySelector("[data-input-cantidad]");
  const btnAgregar = fila.querySelector('[data-accion="agregar"]');
  const btnFinalizar = fila.querySelector('[data-accion="finalizar"]');
  const btnEditar = fila.querySelector('[data-accion="editar"]');
  const btnDeshacer = fila.querySelector('[data-accion="deshacer"]');

  const agregar = () => {
    const valor = parseInt(input.value, 10);
    if (isNaN(valor) || valor < 0) return;
    estado.conteos.push(valor);
    estado.total += valor;
    input.value = "";
    actualizarFilaProducto(p.id);
    guardarSesion();
    input.focus();
  };

  btnAgregar.addEventListener("click", agregar);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); agregar(); }
  });

  btnFinalizar.addEventListener("click", () => {
    if (estado.conteos.length === 0 && estado.total === 0) {
      const confirmar = confirm(`¿Confirmas que hay 0 unidades de "${p.nombre}"?`);
      if (!confirmar) return;
    }
    estado.completado = true;
    fila.classList.add("completado");
    guardarSesion();
    actualizarProgreso();
    actualizarContadorCategoria(fila);
  });

  btnEditar.addEventListener("click", () => {
    estado.completado = false;
    fila.classList.remove("completado");
    guardarSesion();
    actualizarProgreso();
    actualizarContadorCategoria(fila);
  });

  btnDeshacer.addEventListener("click", () => {
    const quitado = estado.conteos.pop();
    if (quitado !== undefined) estado.total -= quitado;
    actualizarFilaProducto(p.id);
    guardarSesion();
  });

  return fila;
}

function actualizarFilaProducto(id) {
  const estado = sesion.productos[id];
  const fila = document.querySelector(`.producto-fila[data-producto-id="${id}"]`);
  if (!fila) return;
  fila.querySelector("[data-total]").textContent = estado.total;
  fila.querySelector("[data-detalle]").textContent = estado.conteos.join(" + ");
  fila.querySelector('[data-accion="deshacer"]').hidden = estado.conteos.length === 0;
}

function actualizarContadorCategoria(fila) {
  const bloque = fila.closest(".categoria-bloque");
  const nombreCat = bloque.dataset.categoria;
  const cat = CATEGORIAS.find((c) => c.categoria === nombreCat);
  const completados = cat.productos.filter((p) => sesion.productos[p.id].completado).length;
  bloque.querySelector(".categoria-contador").textContent = `${completados}/${cat.productos.length}`;
}

function actualizarProgreso() {
  const total = TODOS_LOS_PRODUCTOS.length;
  const contados = TODOS_LOS_PRODUCTOS.filter((p) => sesion.productos[p.id].completado).length;
  document.getElementById("progreso-contados").textContent = contados;
  document.getElementById("progreso-total").textContent = total;
  document.getElementById("barra-progreso-relleno").style.width = `${(contados / total) * 100}%`;
}

// ---------------------------------------------------------------------
// Buscador
// ---------------------------------------------------------------------
document.getElementById("input-buscar").addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll(".categoria-bloque").forEach((bloque) => {
    let algunaVisible = false;
    bloque.querySelectorAll(".producto-fila").forEach((fila) => {
      const coincide = fila.dataset.nombreBusqueda.includes(q);
      fila.classList.toggle("oculto", q.length > 0 && !coincide);
      if (coincide) algunaVisible = true;
    });
    if (q.length > 0) {
      bloque.classList.toggle("abierta", algunaVisible);
      bloque.style.display = algunaVisible ? "" : "none";
    } else {
      bloque.style.display = "";
    }
  });
});

// ---------------------------------------------------------------------
// Pantalla observaciones
// ---------------------------------------------------------------------
document.getElementById("btn-observaciones").addEventListener("click", () => {
  document.getElementById("input-observaciones").value = sesion.observaciones || "";
  const pendientes = TODOS_LOS_PRODUCTOS.filter((p) => !sesion.productos[p.id].completado);
  const bloquePendientes = document.getElementById("resumen-pendientes");
  if (pendientes.length > 0) {
    bloquePendientes.hidden = false;
    document.getElementById("num-pendientes").textContent = pendientes.length;
    const ul = document.getElementById("lista-pendientes");
    ul.innerHTML = pendientes.slice(0, 15).map((p) => `<li>${p.nombre}${p.gramaje ? " · " + p.gramaje : ""}</li>`).join("");
    if (pendientes.length > 15) {
      ul.innerHTML += `<li>y ${pendientes.length - 15} más…</li>`;
    }
  } else {
    bloquePendientes.hidden = true;
  }
  mostrarPantalla("pantalla-observaciones");
});

document.getElementById("input-observaciones").addEventListener("input", (e) => {
  sesion.observaciones = e.target.value;
  guardarSesion();
});

// ---------------------------------------------------------------------
// Finalizar inventario
// ---------------------------------------------------------------------
document.getElementById("btn-finalizar").addEventListener("click", async () => {
  const pendientes = TODOS_LOS_PRODUCTOS.filter((p) => !sesion.productos[p.id].completado);
  if (pendientes.length > 0) {
    const seguro = confirm(`Todavía hay ${pendientes.length} producto(s) sin marcar como contados. ¿Finalizar de todas formas?`);
    if (!seguro) return;
  }

  const btn = document.getElementById("btn-finalizar");
  btn.disabled = true;
  btn.textContent = "Guardando…";

  const productosFinal = TODOS_LOS_PRODUCTOS.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    gramaje: p.gramaje,
    categoria: p.categoria,
    total: sesion.productos[p.id].total,
  }));

  const documento = {
    responsable: sesion.responsable,
    turno: sesion.turno,
    fecha: sesion.fecha,
    observaciones: sesion.observaciones || "",
    productos: productosFinal,
  };

  window.__ultimoInventario = documento; // usado por el PDF

  if (db) {
    try {
      documento.creadoEn = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection(COL_INVENTARIOS).add(documento);

      const valores = {};
      productosFinal.forEach((p) => { valores[p.id] = p.total; });
      await db.doc(DOC_ULTIMO_CONTEO).set({
        turno: sesion.turno,
        fecha: sesion.fecha,
        responsable: sesion.responsable,
        valores,
      });
    } catch (e) {
      console.error("No se pudo guardar en la nube:", e);
      alert("El inventario se generó, pero no se pudo subir a la base de datos (revisa tu conexión). El PDF sí está listo para descargar.");
    }
  }

  localStorage.removeItem(CLAVE_SESION);

  const totalPiezas = productosFinal.reduce((acc, p) => acc + p.total, 0);
  document.getElementById("resumen-detalle").innerHTML =
    `Turno <strong>${sesion.turno}</strong> · ${sesion.fecha}<br>Responsable: ${sesion.responsable}<br>${totalPiezas} piezas contadas en total.`;

  btn.disabled = false;
  btn.textContent = "Finalizar inventario";
  mostrarPantalla("pantalla-resumen");
});

document.getElementById("btn-nuevo-inventario").addEventListener("click", () => {
  sesion = sesionVacia();
  guardarSesion();
  document.getElementById("form-datos").reset();
  mostrarPantalla("pantalla-inicio");
});

// ---------------------------------------------------------------------
// Generar PDF
// ---------------------------------------------------------------------
function generarPDF(documento) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(12, 59, 68);
  doc.text("AQUAMATIC", 14, 18);

  doc.setFontSize(12);
  doc.setTextColor(31, 182, 201);
  doc.text("Reporte de inventario", 14, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`Fecha: ${documento.fecha}`, 14, 34);
  doc.text(`Turno: ${documento.turno}`, 80, 34);
  doc.text(`Responsable: ${documento.responsable}`, 140, 34, { maxWidth: 60 });

  const filas = documento.productos.map((p) => [p.nombre, p.gramaje || "-", String(p.total)]);

  doc.autoTable({
    startY: 40,
    head: [["Producto", "Gramaje", "Total"]],
    body: filas,
    headStyles: { fillColor: [12, 59, 68], textColor: 255 },
    alternateRowStyles: { fillColor: [228, 247, 248] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 2: { halign: "right", fontStyle: "bold" } },
  });

  let finalY = doc.lastAutoTable.finalY + 10;

  if (documento.observaciones) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(12, 59, 68);
    doc.text("Observaciones:", 14, finalY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const lineas = doc.splitTextToSize(documento.observaciones, 180);
    doc.text(lineas, 14, finalY + 6);
  }

  const nombreArchivo = `Aquamatic_Inventario_${documento.turno}_${documento.fecha.replace(/\//g, "-")}.pdf`;
  doc.save(nombreArchivo);
}

document.getElementById("btn-descargar-pdf").addEventListener("click", () => {
  if (window.__ultimoInventario) generarPDF(window.__ultimoInventario);
});

document.getElementById("btn-descargar-pdf-historial").addEventListener("click", () => {
  if (window.__inventarioHistorialActual) generarPDF(window.__inventarioHistorialActual);
});

// ---------------------------------------------------------------------
// Historial
// ---------------------------------------------------------------------
async function cargarHistorial() {
  const contenedor = document.getElementById("historial-contenido");
  if (!db) {
    contenedor.innerHTML = `<p class="historial-vacio">No hay base de datos conectada todavía. Cuando se configure Firebase, aquí aparecerán los inventarios guardados.</p>`;
    return;
  }
  contenedor.innerHTML = `<p class="historial-vacio">Cargando…</p>`;
  try {
    const snap = await db.collection(COL_INVENTARIOS).orderBy("creadoEn", "desc").limit(30).get();
    if (snap.empty) {
      contenedor.innerHTML = `<p class="historial-vacio">Todavía no hay inventarios guardados.</p>`;
      return;
    }
    contenedor.innerHTML = "";
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const item = document.createElement("button");
      item.type = "button";
      item.className = "historial-item";
      const totalPiezas = (data.productos || []).reduce((a, p) => a + p.total, 0);
      item.innerHTML = `
        <span class="historial-item-turno">${data.turno} · ${data.fecha}</span>
        <span class="historial-item-meta">${data.responsable} — ${totalPiezas} piezas</span>
      `;
      item.addEventListener("click", () => mostrarDetalleHistorial(data));
      contenedor.appendChild(item);
    });
  } catch (e) {
    console.error(e);
    contenedor.innerHTML = `<p class="historial-vacio">No se pudo cargar el historial. Revisa tu conexión.</p>`;
  }
}

function mostrarDetalleHistorial(data) {
  window.__inventarioHistorialActual = data;
  document.getElementById("historial-detalle-titulo").textContent = `${data.turno} · ${data.fecha}`;
  const cont = document.getElementById("historial-detalle-contenido");
  const filas = (data.productos || [])
    .map((p) => `<tr><td>${p.nombre}${p.gramaje ? " · " + p.gramaje : ""}</td><td style="text-align:right">${p.total}</td></tr>`)
    .join("");
  cont.innerHTML = `
    <p class="obs-ayuda">Responsable: ${data.responsable}</p>
    ${data.observaciones ? `<p class="obs-ayuda"><strong>Observaciones:</strong> ${data.observaciones}</p>` : ""}
    <table class="historial-tabla">
      <thead><tr><th>Producto</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
  `;
  mostrarPantalla("pantalla-historial-detalle");
}

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------
document.getElementById("fecha-hoy").textContent = fechaLegible(new Date());
