# 🖥️ Server Monitoring Dashboard

Dashboard web avanzado para **monitoreo en tiempo real de servidores Linux / Windows**, con alertas visuales, métricas detalladas y soporte para múltiples servidores usando una API propia en Python.

---

## ✨ Características

- 📊 Monitoreo en tiempo real (CPU, RAM, DISK)
- 🟢 Detección de servidores ONLINE / OFFLINE
- 🚨 Alertas visuales por severidad (Normal / Warning / Critical)
- 🌈 Alertas visuales por tipo:
  - ⚡ CPU (naranja)
  - 🧠 RAM (rosa)
  - 💾 DISK (rojo)
- 🔴 Halo crítico animado en la parte superior (modo NOC)
- 🔍 Buscador de servidores
- 📱 Diseño responsive (PC / Tablet / Mobile)
- 🧠 Información detallada del sistema:
  - Hostname
  - Arquitectura
  - Procesos
  - Red
  - Uptime
- 🧩 Soporte para múltiples servidores
- 🌐 Vista embebida del panel individual por servidor (iframe)

---

## 🏗️ Arquitectura del Proyecto

```

server-monitoring/
│
├── backend/
│ ├── agent_metrics.py # API de métricas (Python + Flask)
│
├── frontend/
│ ├── src/
│ │ ├── App.jsx # Dashboard principal
│ │ ├── Dashboard.css # Estilos y animaciones
│ │ ├── data/
│ │ │ └── servers.js # Lista de servidores
│ │ └── main.jsx
│ └── package.json
│
└── README.md

```

---

## ⚙️ Backend – Agente de Métricas (Python)

### Requisitos

- Python 3.9+
- Linux / Windows

### Instalación

```bash
python3 -m venv venv
source venv/bin/activate   # Linux
venv\Scripts\activate      # Windows

pip install flask psutil flask-cors
```

### Ejecutar el agente

```bash
python agent_metrics.py
```

Por defecto expone la API en:

```
http://IP_DEL_SERVIDOR:9100/metrics
```

---

## 🌐 Frontend – Dashboard (React)

### Requisitos

- Node.js 18+
- npm

### Instalación

```bash
cd frontend
npm install
```

### Ejecutar en desarrollo

```bash
npm run dev
```

Accede en:

```
http://localhost:5173
```

---

## 🗂️ Configuración de Servidores

Archivo:

```
src/data/servers.js
```

Ejemplo:

```js
const servers = [
  {
    name: "DokPloy VPS",
    api: "http://192.168.1.10:9100/metrics",
    page: "http://192.168.1.10:3000",
  },
  {
    name: "Servidor Casa",
    api: "http://192.168.1.18:9100/metrics",
    page: "http://192.168.1.18:3000",
  },
];

export default servers;
```

---

## 🚨 Sistema de Alertas

### Umbrales por defecto

| Métrica | Warning | Critical |
| ------- | ------- | -------- |
| CPU     | 70%     | 85%      |
| RAM     | 75%     | 90%      |
| DISK    | 80%     | 95%      |

### Alertas visuales

- Halo superior animado cuando hay críticos
- Animaciones diferenciadas por tipo de métrica
- Scroll automático al servidor crítico
- Texto de estado crítico visible en el header

---

## 🎨 Diseño y UX

- Animaciones suaves
- Transiciones sin saltos
- Modo NOC (alta visibilidad)
- Diseño limpio y profesional
- Inspirado en dashboards tipo Grafana / Datadog

---

## 🔐 Seguridad (Recomendado)

- Colocar el backend detrás de un firewall
- Usar HTTPS con Nginx / Caddy
- Limitar acceso por IP
- No exponer la API a internet sin protección

---

## 🚀 Próximas Mejoras (Ideas)

- 📈 Gráficos históricos
- 📜 Historial de alertas
- 🔔 Notificaciones (Discord / Telegram)
- 🌗 Modo claro / oscuro
- 🧭 Rotación automática de servidores críticos
- 👥 Multiusuario

---

## 👨‍💻 Autor

Desarrollado por **Christofer Rodríguez (SukeK)**
Proyecto personal de monitoreo y aprendizaje avanzado.

---

## 🧠 Nota Final

> _Cada dashboard que monitorea bien, evita problemas antes de que ocurran._
