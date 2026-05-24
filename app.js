/**
 * Lógica de Control de Aplicación PWA
 * Base de Datos Local: IndexedDB
 * © Copyright Vibras Positivas. Todos los derechos reservados.
 */

// Registro del Service Worker para el modo Offline
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('PWA: Service Worker registrado de forma exitosa.', reg.scope))
            .catch(err => console.error('PWA: Fallo en el registro del Service Worker.', err));
    });
}

// Configuración de la base de datos local IndexedDB
let db;
const requestDB = indexedDB.open('ControlPajaritaDB', 1);

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

requestDB.onerror = function(e) {
    console.error('Error abriendo la base de datos local:', e.target.errorCode);
};

// Controladores visuales de estado de conexión de red
const statusDiv = document.getElementById('connection-status');
window.addEventListener('online', () => {
    statusDiv.innerHTML = `<span class="w-2 h-2 rounded-full bg-white animate-pulse"></span> En Línea`;
    statusDiv.className = "bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow-sm";
    // Aquí se ejecutaría un script para subir los datos de IndexedDB a un servidor en la nube (ej. Firebase/Supabase)
});

window.addEventListener('offline', () => {
    statusDiv.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Modo Offline`;
    statusDiv.className = "bg-rose-700 text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow-sm";
});

// Manejo del Envío del Formulario
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

    const nuevoRegistro = {
        fecha,
        operador,
        hInicial,
        hFinal,
        horasTrabajadas: parseFloat((hFinal - hInicial).toFixed(2)),
        combustible,
        notas,
        timestamp: new Date().getTime()
    };

    // Almacenamiento en IndexedDB
    const tx = db.transaction(['registros'], 'readwrite');
    const store = tx.objectStore('registros');
    store.add(nuevoRegistro);

    tx.oncomplete = function() {
        document.getElementById('form-registro').reset();
        actualizarInterfaz();
    };
});

// Renderizado y recálculo de KPI de mantenimiento en la UI
function actualizarInterfaz() {
    const tx = db.transaction(['registros'], 'readonly');
    const store = tx.objectStore('registros');
    const request = store.getAll();

    request.onsuccess = function() {
        const registros = request.result;
        const lista = document.getElementById('lista-registros');
        
        if (registros.length === 0) {
            lista.innerHTML = `<p class="text-sm text-slate-500 italic text-center py-4">No hay registros en este dispositivo.</p>`;
            document.getElementById('stat-horometro').innerText = "0.0 hrs";
            document.getElementById('stat-mantenimiento').innerText = "Sin registros";
            document.getElementById('stat-mantenimiento').className = "text-sm font-bold text-slate-400 block mt-1";
            return;
        }

        // Ordenar registros por fecha (más reciente arriba)
        registros.sort((a, b) => b.timestamp - a.timestamp);

        // Obtener el último horómetro total registrado
        const ultimoHorometro = registros[0].hFinal;
        document.getElementById('stat-horometro').innerText = `${ultimoHorometro.toFixed(1)} hrs`;

        // Lógica de Mantenimiento Preventivo (Ciclos de 250 horas)
        const cicloMantenimiento = 250;
        const horasRestantesParaCambio = cicloMantenimiento - (ultimoHorometro % cicloMantenimiento);
        
        const mtoStat = document.getElementById('stat-mantenimiento');
        mtoStat.innerText = `Faltan ${horasRestantesParaCambio.toFixed(1)} hrs`;
        
        if (horasRestantesParaCambio <= 25) {
            mtoStat.className = "text-sm font-black text-rose-500 block mt-1 animate-pulse";
            mtoStat.innerText += " ⚠️ ¡CAMBIO DE ACEITE PRÓXIMO!";
        } else if (horasRestantesParaCambio <= 60) {
            mtoStat.className = "text-sm font-bold text-amber-500 block mt-1";
        } else {
            mtoStat.className = "text-sm font-bold text-emerald-400 block mt-1";
        }

        // Renderizar lista en la pantalla
        lista.innerHTML = '';
        registros.forEach(reg => {
            const item = document.createElement('div');
            item.className = "bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5";
            item.innerHTML = `
                <div class="flex justify-between font-bold text-slate-300">
                    <span>📅 ${reg.fecha}</span>
                    <span class="text-amber-400">⏱️ +${reg.horasTrabajadas} hrs</span>
                </div>
                <div class="text-slate-400 grid grid-cols-2 gap-1">
                    <p>👷 <span class="text-slate-300">${reg.operador}</span></p>
                    <p>⛽ ${reg.combustible} Galones</p>
                    <p class="col-span-2 text-slate-500">Rango: ${reg.hInicial} -> ${reg.hFinal}</p>
                </div>
                ${reg.notas ? `<p class="text-slate-400 italic bg-slate-900/50 p-1.5 rounded mt-1 text-[11px] border-l-2 border-slate-700">${reg.notas}</p>` : ''}
            `;
            lista.appendChild(item);
        });
    };
}
