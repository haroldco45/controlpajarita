# 🚜 Control de Retroexcavadora Pajarita - PWA

Aplicación Web Progresiva (PWA) de alto rendimiento diseñada para la gestión operativa y el control financiero de maquinaria pesada en campo. Desarrollada para funcionar de forma **100% offline (sin internet)** en zonas rurales, eliminando la necesidad de servidores o bases de datos centralizadas costosas mediante un ecosistema de transferencia de datos seguro por **WhatsApp**.

---

## 🚀 Características Clave

* **Funcionamiento 100% Offline:** Gracias a los Service Workers, la aplicación carga de forma instantánea en cualquier vereda o frente de obra sin señal celular.
* **Base de Datos Local Segura:** Almacenamiento local directo en el dispositivo del usuario utilizando **IndexedDB**.
* **Arquitectura Sin Servidores (Serverless):** La transferencia y absorción de información entre múltiples dispositivos se realiza codificando los datos en Base64 a través de enlaces nativos de WhatsApp.
* **Módulo Administrativo con Clave:** Bloqueo de seguridad para proteger la visualización de tarifas de contratos, sueldos de operadores y costos de ACPM frente a terceros.
* **Reportes e Impresión Inteligente:** Formateador CSS multimedia que convierte la interfaz en un reporte contable limpio imprimible o exportable a PDF con un solo clic.
* **Previsualización Profesional:** Integración de metadatos Open Graph (OG) para desplegar tarjetas visuales de alta calidad con el logotipo oficial de la maquinaria al compartir el enlace.

---

## 🗂️ Arquitectura del Proyecto

El sistema está estructurado de manera limpia en la raíz del repositorio para su despliegue inmediato en servidores estáticos como **GitHub Pages** o **Netlify**:

├── index.html          # Interfaz de usuario responsiva, metadatos OG y formularios.
├── app.js              # Lógica de negocio, IndexedDB, cifrado Base64 y control de Admin.
├── sw.js               # Service Worker para almacenamiento en caché y soporte offline.
├── styles.css          # Estilos personalizados y reglas multimedia para impresión PDF.
├── manifest.json       # Manifiesto de instalación para habilitar el botón "Instalar App".
└── 1779618748797.png   # Logotipo corporativo oficial para previsualización en redes.
