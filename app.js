/**
 * Lógica de Control de Aplicación PWA con Enlaces de WhatsApp
 * Base de Datos Local: IndexedDB
 * © Copyright VIBRAS POSITIVAS HM. Todos los derechos reservados.
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
const CLAVE_ADMIN = "1234"; 
const TELEFONO_INGENIERO = "573117700431"; // Formato internacional para Colombia

const requestDB = indexedDB.open('ControlPajaritaDB', 2);

requestDB.onupgradeneeded = function(e) {
    db = e.target.result;
    if (!db.objectStoreNames.contains('registros')) {
        db.createObjectStore('registros', { keyPath: 'id', autoIncrement: true });
    }
};

requestDB.onsuccess = function(e) {
    db = e.target.result;
    procesarDatosDesdeURL();
};

requestDB.onerror = function(e) {
    console.error("Error al abrir IndexedDB:", e);
};

// Función segura para decodificar Base64 con soporte de caracteres especiales (UTF-8)
function decodeBase64UTF8(str) {
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

// Función segura para codificar Base64 con soporte de caracteres especiales (UTF-8)
function encodeBase64UTF8(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}

// Procesar y absorber los datos que llegan desde el link de WhatsApp
function procesarDatosDesdeURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const datosBase64 = urlParams.get('d');

    if (datosBase64) {
        try {
            const jsonTexto = decodeBase64UTF8(datosBase64);
            const datosDecodificados = JSON.parse(jsonTexto);
            
            if (datosDecodificados.fecha && datosDecodificados.hFinal) {
                const tx = db.transaction(['registros'], 'readwrite');
                const store = tx.objectStore('registros');
                
                const requestCheck = store.getAll();
                requestCheck.onsuccess = function() {
                    const existentes = requestCheck.result;
                    const esDuplicado = existentes.some(r => r.timestamp === datosDecodificados.timestamp);
                    
                    if (!esDuplicado) {
                        store.add(datosDecodificados);
                        tx.oncomplete = function() {
                            alert(`✔️ ¡Éxito! Registro de la fecha ${datosDecodificados.fecha} integrado a tu base histórica.`);
                            window.history.replaceState({}, document.title, window.location.pathname);
                            actualizarInterfaz();
                        };
                    } else {
                        alert(`ℹ️ Este registro ya existía en tu base histórica.`);
                        window.history.replaceState({}, document.title, window.location.pathname);
                        actualizarInterfaz();
                    }
                };
            }
        } catch (error) {
            console.error("Error al decodificar los datos del enlace:", error);
            alert("❌ El enlace de datos de WhatsApp parece estar incompleto o dañado.");
            window.history.replaceState({}, document.title, window.location.pathname);
            actualizarInterfaz();
        }
    } else {
        actualizarInterfaz();
    }
}

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
            actualizarInterfaz();
        } else {
            alert("❌ Clave incorrecta.");
        }
    } else {
        isAdminAuthenticated = false;
        this.innerText = "Lock Admin 🔒";
        this.classList.remove('text-emerald-400');
        this.classList.add('text-amber-400');
        document.getElementById('modulo-admin').classList.add('hidden');
        actualizarInterfaz();
    }
});

// Manejo de Estado de Red
const statusDiv = document.getElementById('connection-status');
window.addEventListener('online', () => {
    statusDiv.innerHTML = `<span class="w-2 h-2 rounded-full bg-white animate-pulse"></span> En Línea`;
    statusDiv.className = "bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow-sm";
});
window.addEventListener('offline', () => {
    statusDiv.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Modo Offline`;
    statusDiv.className = "bg-rose-700 text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow-sm";
});

// Guardar Registro Diario y Disparar WhatsApp
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

    const vHoraContrato = parseFloat(document.getElementById('admin-valor-hora').value) || 0;
    const sOperadorHora = parseFloat(document.getElementById('admin-sueldo-operador').value) || 0;
    const cCombustibleGalon = parseFloat(document.getElementById('admin-costo-combustible').value) || 0;
    const oGastos = parseFloat(document.getElementById('admin-otros-gastos').value) || 0;

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

    // 1. Guardar localmente
    const tx = db.transaction(['registros'], 'readwrite');
    const store = tx.objectStore('registros');
    store.add(nuevoRegistro);

    tx.oncomplete = function() {
        document.getElementById('form-registro').reset();
        actualizarInterfaz();

        // 2. CONSTRUIR ENLACE DE TRANSFERENCIA SEGURO
        const urlBase = window.location.origin + window.location.pathname;
        const stringCadena = JSON.stringify(nuevoRegistro);
        
        // Uso de la nueva función de codificación sin métodos obsoletos
        const base64Datos = encodeBase64UTF8(stringCadena);
        const enlaceFinalDeSincronizacion = `${urlBase}?d=${base64Datos}`;

        // 3. REDACTAR MENSAJE PARA WHATSAPP
        const textoMensaje = `⚠️ *REPORTE PAJARITA - ${fecha}*\n\n` +
                             `👷 *Operador:* ${operador}\n` +
                             `⏱️ *Horas Trabajadas:* ${horasTrabajadas} hrs\n` +
                             `⛽ *Combustible:* ${combustible} Gal.\n` +
                             `📝 *Notas:* ${notas || 'Ninguna'}\n\n` +
                             `🔗 *Ingeniero, toque este link para actualizar su base histórica:* \n${enlaceFinalDeSincronizacion}`;

        // 4. DISPARAR WHATSAPP (Formato compatible universal)
        const urlWhatsapp = `https://wa.me/${TELEFONO_INGENIERO}?text=${encodeURIComponent(textoMensaje)}`;
        
        // Redirección directa en la misma pestaña para mejorar compatibilidad en PWAs móviles
        window.location.href = urlWhatsapp;
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
                            <span class="font-bold text-amber-400 uppercase tracking-wider text-[10px]">Utilidad Neta:</span>
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

// BOTÓN BACKUP
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

// BOTÓN INFORME / IMPRIMIR
document.getElementById('btn-informe').addEventListener('click', function() {
    const titulo = document.getElementById('titulo-historial');
    const originalText = titulo.innerText;
    
    titulo.innerText = isAdminAuthenticated 
        ? "INFORME OPERATIVO Y FINANCIERO - CONTROL PAJARITA" 
        : "INFORME DE JORNADAS OPERATIVAS - CONTROL PAJARITA";
    
    window.print();
    titulo.innerText = originalText;
});
