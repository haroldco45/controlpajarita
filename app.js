/**
 * Lógica de Control de Aplicación PWA con Módulo Financiero
 * Base de Datos Local: IndexedDB
 * © Copyright Vibras Positivas. Todos los derechos reservados.
 */

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('PWA: Service Worker registrado.'))
            .catch(err => console.error('PWA: Fallo en SW.', err));
    });
}

let db;
let isAdminAuthenticated = false;
const CLAVE_ADMIN = "1234"; // Cambiar por la contraseña de preferencia del Ingeniero

const requestDB = indexedDB.open('ControlPajaritaDB', 2); // Subimos versión por cambio de esquema financiero

requestDB.onupgradeneeded = function(e) {
    db = e.target.result;
    if (!db.objectStoreNames.contains('registros')) {
        db.createObjectStore('registros', { keyPath: 'id', autoIncrement: true });
    }
};

requestDB.onsuccess = function(e) {
    db = e.target.result;
    actualizarInterfaz();
};

// Control de Autenticación de Módulo Administrativo
document.getElementById('btn-toggle-admin').addEventListener('click', function() {
    if (!isAdminAuthenticated) {
        const pass = prompt("Introduce la clave de acceso de Ingeniero:");
        if (pass === CLAVE_ADMIN) {
            isAdminAuthenticated = true;
            this.innerText = "Unlock Admin 🔓";
            this.classList.remove('text-amber-400');
            this.classList.add('text-emerald-400');
            document.getElementById('modulo-admin').classList.remove('hidden');
            actualizarInterfaz(); // Re-renderizar para mostrar datos financieros
        } else {
            alert("❌ Clave incorrecta. Acceso denegado.");
        }
    } else {
        isAdminAuthenticated = false;
        this.innerText = "Lock Admin 🔒";
        this.classList.remove('text-emerald-400');
        this.classList.add('text-amber-400');
        document.getElementById('modulo-admin').classList.add('hidden');
        actualizarInterfaz(); // Ocultar datos financieros de la vista común
    }
});

// Manejo de Red
const statusDiv = document.getElementById('connection-status');
window.addEventListener('online', () => {
    statusDiv.innerHTML = `<span class="w-2 h-2 rounded-full bg-white animate-pulse"></span> En Línea`;
    statusDiv.className = "bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow-sm";
});
window.addEventListener('offline', () => {
    statusDiv.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Modo Offline`;
    statusDiv.className = "bg-rose-700 text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow-sm";
});

// Guardar Registro Diario
document.getElementById('form-registro').addEventListener('submit', function(e) {
    e.preventDefault();

    const fecha = document.getElementById('input-fecha').value;
    const operador = document.getElementById('input-operador').value;
    const hInicial = parseFloat(document.getElementById('input-h-inicial').value);
    const hFinal = parseFloat(document.getElementById('input-h-final').value);
    const combustible = parseFloat(document.getElementById('input-combustible').value);
    const notas = document.getElementById('input-notas').value;

    if (hFinal <= hInicial) {
        alert('❌ Error: El horómetro final debe ser mayor que el inicial.');
        return;
    }

    const horasTrabajadas = parseFloat((hFinal - hInicial).toFixed(2));

    // Captura de variables financieras del Admin (Si no está activo, guarda en 0)
    const vHoraContrato = parseFloat(document.getElementById('admin-valor-hora').value) || 0;
    const sOperadorHora = parseFloat(document.getElementById('admin-sueldo-operador').value) || 0;
    const cCombustibleGalon = parseFloat(document.getElementById('admin-costo-combustible').value) || 0;
    const oGastos = parseFloat(document.getElementById('admin-otros-gastos').value) || 0;

    // Cálculos matemáticos de control de pérdidas y ganancias
    const ingresoBruto = horasTrabajadas * vHoraContrato;
    const pagoOperadorTotal = horasTrabajadas * sOperadorHora;
    const costoCombustibleTotal = combustible * cCombustibleGalon;
    const utilidadNetaIngeniero = ingresoBruto - (pagoOperadorTotal + costoCombustibleTotal + oGastos);

    const nuevoRegistro = {
        fecha, operador, hInicial, hFinal, horasTrabajadas, combustible, notas,
        finanzas: {
            vHoraContrato, sOperadorHora, cCombustibleGalon, oGastos,
            ingresoBruto, pagoOperadorTotal, costoCombustibleTotal, utilidadNetaIngeniero
        },
        timestamp: new Date().getTime()
    };

    const tx = db.transaction(['registros'], 'readwrite');
    const store = tx.objectStore('registros');
    store.add(nuevoRegistro);

    tx.oncomplete = function() {
        document.getElementById('form-registro').reset();
        actualizarInterfaz();
        alert('✔️ Registro guardado con éxito localmente.');
    };
});

// Renderizado de Datos Dinámicos
function actualizarInterfaz() {
    if (!db) return;
    const tx = db.transaction(['registros'], 'readonly');
    const store = tx.objectStore('registros');
    const request = store.getAll();

    request.onsuccess = function() {
        const registros = request.result;
        const lista = document.getElementById('lista-registros');
        
        if (registros.length === 0) {
            lista.innerHTML = `<p class="text-sm text-slate-500 italic text-center py-4">No hay registros guardados.</p>`;
            document.getElementById('stat-horometro').innerText = "0.0 hrs";
            document.getElementById('stat-mantenimiento').innerText = "Sin registros";
            return;
        }

        registros.sort((a, b) => b.timestamp - a.timestamp);

        const ultimoHorometro = registros[0].hFinal;
        document.getElementById('stat-horometro').innerText = `${ultimoHorometro.toFixed(1)} hrs`;

        const cicloMantenimiento = 250;
        const horasRestantesParaCambio = cicloMantenimiento - (ultimoHorometro % cicloMantenimiento);
        document.getElementById('stat-mantenimiento').innerText = `Faltan ${horasRestantesParaCambio.toFixed(1)} hrs`;

        lista.innerHTML = '';
        registros.forEach(reg => {
            const item = document.createElement('div');
            item.className = "bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-2 break-inside-avoid";
            
            // Sección estándar visible para el operador
            let htmlContenido = `
                <div class="flex justify-between font-bold text-slate-300 border-b border-slate-900 pb-1">
                    <span>📅 ${reg.fecha}</span>
                    <span class="text-amber-400">⏱️ +${reg.horasTrabajadas} hrs</span>
                </div>
                <div class="text-slate-400 grid grid-cols-2 gap-1">
                    <p>👷 Operador: <span class="text-slate-200">${reg.operador}</span></p>
                    <p>⛽ Combustible: ${reg.combustible} Gal.</p>
                    <p class="col-span-2 text-[11px] text-slate-500">Horómetro: ${reg.hInicial} hrs ➡️ ${reg.hFinal} hrs</p>
                </div>
                ${reg.notas ? `<p class="text-slate-400 italic bg-slate-900/40 p-1.5 rounded text-[11px] border-l-2 border-slate-600">${reg.notas}</p>` : ''}
            `;

            // Inyección de Datos Financieros Exclusivos si el Ingeniero está autenticado
            if (isAdminAuthenticated && reg.finanzas) {
                const f = reg.finanzas;
                const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
                
                htmlContenido += `
                    <div class="mt-2 pt-2 border-t border-dashed border-slate-800 grid grid-cols-2 gap-1.5 bg-amber-500/5 p-2 rounded border border-amber-500/10 data-financial">
                        <p class="text-slate-400 font-medium">Contratado: <span class="text-emerald-400 font-bold">${formatMoney(f.ingresoBruto)}</span></p>
                        <p class="text-slate-400 font-medium">Sueldo Op: <span class="text-rose-400 font-bold">${formatMoney(f.pagoOperadorTotal)}</span></p>
                        <p class="text-slate-400 font-medium">Gasto ACPM: <span class="text-rose-400 font-bold">${formatMoney(f.costoCombustibleTotal)}</span></p>
                        <p class="text-slate-400 font-medium">Otros Gastos: <span class="text-rose-400 font-bold">${formatMoney(f.oGastos)}</span></p>
                        <div class="col-span-2 mt-1 pt-1 border-t border-slate-800 flex justify-between items-center">
                            <span class="font-bold text-amber-400 uppercase tracking-wider text-[10px]">Utilidad Neta Ingeniero:</span>
                            <span class="font-black ${f.utilidadNetaIngeniero >= 0 ? 'text-emerald-400' : 'text-rose-500'} text-sm">${formatMoney(f.utilidadNetaIngeniero)}</span>
                        </div>
                    </div>
                `;
            }

            item.innerHTML = htmlContenido;
            lista.appendChild(item);
        });
    };
}

// FUNCIONALIDAD: BOTÓN BACKUP (Exportar base de datos a un archivo físico descargable)
document.getElementById('btn-backup').addEventListener('click', function() {
    const tx = db.transaction(['registros'], 'readonly');
    const store = tx.objectStore('registros');
    const request = store.getAll();

    request.onsuccess = function() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(request.result, null, 2));
        const downloadAnchor = document.createElement('a');
        const fechaHoy = new Date().toISOString().split('T')[0];
        
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `Backup_Pajarita_${fechaHoy}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };
});

// FUNCIONALIDAD: BOTÓN INFORME / IMPRIMIR
document.getElementById('btn-informe').addEventListener('click', function() {
    // Cambiamos temporalmente títulos o estilos para la hoja de impresión si es necesario
    const titulo = document.getElementById('titulo-historial');
    const originalText = titulo.innerText;
    
    titulo.innerText = isAdminAuthenticated 
        ? "INFORME OPERATIVO Y FINANCIERO - CONTROL PAJARITA" 
        : "INFORME DE JORNADAS OPERATIVAS - CONTROL PAJARITA";
    
    // Ejecuta el cuadro de impresión nativo del sistema operativo (admite guardar como PDF en móviles y PC)
    window.print();
    
    // Restauramos texto original en la interfaz de pantalla
    titulo.innerText = originalText;
});
