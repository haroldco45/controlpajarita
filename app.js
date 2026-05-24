/**
 * Lógica de Control de Aplicación PWA con Enlaces de WhatsApp e Inyección Cruzada
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
const TELEFONO_INGENIERO = "573117700431"; 

const requestDB = indexedDB.open('ControlPajaritaDB', 2);

requestDB.onupgradeneeded = function(e) {
    db = e.target.result;
    if (!db.objectStoreNames.contains('registros')) {
        db.createObjectStore('registros', { keyPath: 'id', autoIncrement: true });
    }
};

requestDB.onsuccess = function(e) {
    db = e.target.result;
    cargarTarifasEInyecciones(); // Carga LocalStorage o Parámetros del link del Operador
    procesarDatosDesdeURL();
};

function decodeBase64UTF8(str) {
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

function encodeBase64UTF8(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}

// NUEVO: Procesa si el teléfono es el del Operador y tiene tarifas inyectadas en su link inicial
function cargarTarifasEInyecciones() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Si viene con inyección de tarifas financieras del Ingeniero (?vH=...)
    if (urlParams.get('vH')) {
        document.getElementById('admin-valor-hora').value = urlParams.get('vH');
        document.getElementById('admin-sueldo-operador').value = urlParams.get('sO');
        document.getElementById('admin-costo-combustible').value = urlParams.get('cC');
        document.getElementById('admin-otros-gastos').value = urlParams.get('oG') || 0;
        
        // Las guarda localmente en el celular del operario de forma interna
        localStorage.setItem('tarifa_valor_hora', urlParams.get('vH'));
        localStorage.setItem('tarifa_sueldo_operador', urlParams.get('sO'));
        localStorage.setItem('tarifa_costo_combustible', urlParams.get('cC'));
        localStorage.setItem('tarifa_otros_gastos', urlParams.get('oG') || 0);
    } else {
        // Si no hay parámetros en la URL, lee la memoria local normal de este teléfono
        if (localStorage.getItem('tarifa_valor_hora')) {
            document.getElementById('admin-valor-hora').value = localStorage.getItem('tarifa_valor_hora');
        }
        if (localStorage.getItem('tarifa_sueldo_operador')) {
            document.getElementById('admin-sueldo-operador').value = localStorage.getItem('tarifa_sueldo_operador');
        }
        if (localStorage.getItem('tarifa_costo_combustible')) {
            document.getElementById('admin-costo-combustible').value = localStorage.getItem('tarifa_costo_combustible');
        }
        if (localStorage.getItem('tarifa_otros_gastos')) {
            document.getElementById('admin-otros-gastos').value = localStorage.getItem('tarifa_otros_gastos');
        }
    }
}

// Absorber datos cuando tú (Ingeniero) toques el reporte diario enviado por el operador
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
                            alert(`✔️ ¡Éxito! Registro absorbido e integrado a tu base histórica.`);
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
            console.error("Error al decodificar:", error);
            window.history.replaceState({}, document.title, window.location.pathname);
            actualizarInterfaz();
        }
    } else {
        actualizarInterfaz();
    }
}

// Guardar Tarifas Locales
document.getElementById('btn-guardar-tarifas').addEventListener('click', function() {
    localStorage.setItem('tarifa_valor_hora', document.getElementById('admin-valor-hora').value);
    localStorage.setItem('tarifa_sueldo_operador', document.getElementById('admin-sueldo-operador').value);
    localStorage.setItem('tarifa_costo_combustible', document.getElementById('admin-costo-combustible').value);
    localStorage.setItem('tarifa_otros_gastos', document.getElementById('admin-otros-gastos').value);
    alert("✔️ Tarifas guardadas localmente.");
});

// NUEVO: Generar y compartir el Link Maestro con las tarifas inyectadas para el celular del operador
document.getElementById('btn-compartir-operador').addEventListener('click', function() {
    const vH = document.getElementById('admin-valor-hora').value;
    const sO = document.getElementById('admin-sueldo-operador').value;
    const cC = document.getElementById('admin-costo-combustible').value;
    const oG = document.getElementById('admin-otros-gastos').value || 0;

    if(!vH || !sO || !cC) {
        alert("❌ Por favor digita las tarifas antes de generar el link para el operador.");
        return;
    }

    const urlBase = window.location.origin + window.location.pathname;
    const enlaceOperador = `${urlBase}?vH=${vH}&sO=${sO}&cC=${cC}&oG=${oG}`;

    const textoWhatsApp = `🚜 *ENLACE CONFIGURADO CONTROL PAJARITA*\n\n` +
                          `Hola, toca este enlace para abrir e instalar la aplicación en tu celular con los parámetros listos para trabajar:\n\n🔗 ${enlaceOperador}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(textoWhatsApp)}`, '_blank');
});

// Control de Módulo Administrativo
document.getElementById('btn-toggle-admin').addEventListener('click', function() {
    if (!isAdminAuthenticated) {
        const pass = prompt("Introduce la clave de acceso de Ingeniero:");
        if (pass === CLAVE_ADMIN) {
            isAdminAuthenticated = true;
            this.innerText = "🔒 Cerrar Admin";
            document.getElementById('modulo-admin').classList.remove('hidden');
            actualizarInterfaz();
        } else {
            alert("❌ Clave incorrecta.");
        }
    } else {
        isAdminAuthenticated = false;
        this.innerText = "🔓 Abrir Admin";
        document.getElementById('modulo-admin').classList.add('hidden');
        actualizarInterfaz();
    }
});

// Estado de Red
const statusDiv = document.getElementById('connection-status');
window.addEventListener('online', () => {
    statusDiv.innerHTML = `<span class="w-2 h-2 rounded-full bg-white animate-pulse"></span> En Línea`;
    statusDiv.className = "bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow-sm";
});
window.addEventListener('offline', () => {
    statusDiv.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Modo Offline`;
    statusDiv.className = "bg-rose-700 text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow-sm";
});

// Envío del Formulario Diario por el Operario
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

    // Obtener los valores (ya sea que se cargaron por link o localmente)
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

    const tx = db.transaction(['registros'], 'readwrite');
    const store = tx.objectStore('registros');
    store.add(nuevoRegistro);

    tx.oncomplete = function() {
        document.getElementById('form-registro').reset();
        actualizarInterfaz();

        const urlBase = window.location.origin + window.location.pathname;
        const stringCadena = JSON.stringify(nuevoRegistro);
        const base64Datos = encodeBase64UTF8(stringCadena);
        const enlaceFinalDeSincronizacion = `${urlBase}?d=${base64Datos}`;

        const textoMensaje = `⚠️ *REPORTE PAJARITA - ${fecha}*\n\n` +
                             `👷 *Operador:* ${operador}\n` +
                             `⏱️ *Horas Trabajadas:* ${horasTrabajadas} hrs\n` +
                             `⛽ *Combustible:* ${combustible} Gal.\n` +
                             `📝 *Notas:* ${notas || 'Ninguna'}\n\n` +
                             `🔗 *Ingeniero, toque este link para actualizar su base histórica:* \n${enlaceFinalDeSincronizacion}`;

        const urlWhatsapp = `https://wa.me/${TELEFONO_INGENIERO}?text=${encodeURIComponent(textoMensaje)}`;
        window.location.href = urlWhatsapp;
    };
});

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

// BACKUP Y REPORTES
document.getElementById('btn-backup').addEventListener('click', function() {
    const tx = db.transaction(['registros'], 'readonly');
    const store = tx.objectStore('registros');
    const request = store.getAll();
    request.onsuccess = function() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(request.result, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `Backup_Pajarita_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };
});

document.getElementById('btn-informe').addEventListener('click', function() {
    const titulo = document.getElementById('titulo-historial');
    const originalText = titulo.innerText;
    titulo.innerText = isAdminAuthenticated ? "INFORME OPERATIVO Y FINANCIERO - CONTROL PAJARITA" : "INFORME DE JORNADAS OPERATIVAS - CONTROL PAJARITA";
    window.print();
    titulo.innerText = originalText;
});
