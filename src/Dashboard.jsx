import { useEffect, useState, useRef } from "react";
import servers from "./data/servers";
import "./Dashboard.css";

/* Helpers para alertas */
function getAlertLevel(value, warning, critical) {
  if (value >= critical) return "critical";
  if (value >= warning) return "warning";
  return "normal";
}

/* Helper para extraer porcentaje de uso de disco */
function getMaxDiskUsage(partitions) {
  if (!partitions || !Array.isArray(partitions) || partitions.length === 0) {
    return 0;
  }
  return Math.max(...partitions.map((p) => p.percent || 0));
}

/* Helper para formatear bytes a unidades legibles */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0 || !bytes) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/* Helper para formatear tiempo de actividad */
function formatUptime(seconds) {
  if (!seconds) return "0s";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export default function Dashboard() {
  const criticalRef = useRef(null);
  const [hasScrolledToCritical, setHasScrolledToCritical] = useState(false);

  const [status, setStatus] = useState({});
  const [metrics, setMetrics] = useState({});
  const [detailedMetrics, setDetailedMetrics] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    avgCpu: 0,
    avgRam: 0,
    avgDisk: 0,
  });

  useEffect(() => {
    const fetchMetrics = async (server) => {
      try {
        const response = await fetch(server.api);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();

        // Determinar si estamos usando la nueva API (v2.0.0) o la vieja
        const isNewAPI =
          data.hasOwnProperty("timestamp") &&
          data.hasOwnProperty("uptime_seconds") &&
          data.hasOwnProperty("system");

        if (isNewAPI) {
          // Nueva API - Datos estructurados
          const cpuPercent = data.cpu?.percent || 0;
          const memoryPercent = data.memory?.percent || 0;
          const diskPercent = getMaxDiskUsage(data.disk?.partitions);

          // Métricas detalladas para mostrar
          setDetailedMetrics((prev) => ({
            ...prev,
            [server.name]: {
              cpu: data.cpu || {},
              memory: data.memory || {},
              disk: data.disk || {},
              network: data.network || {},
              processes: data.processes || {},
              system: data.system || {},
              uptime: data.uptime_seconds || 0,
              timestamp: data.timestamp,
            },
          }));

          setMetrics((prev) => ({
            ...prev,
            [server.name]: {
              cpu: cpuPercent,
              ram: memoryPercent,
              disk: diskPercent,
            },
          }));
        } else {
          // API antigua - Compatibilidad
          const cpuPercent = data.cpu?.percent || 0;
          const memoryPercent = data.memory?.virtual?.percent || 0;
          const diskPercent = getMaxDiskUsage(data.disk?.partitions);

          setMetrics((prev) => ({
            ...prev,
            [server.name]: {
              cpu: cpuPercent,
              ram: memoryPercent,
              disk: diskPercent,
            },
          }));
        }

        setStatus((prev) => ({ ...prev, [server.name]: true }));
      } catch (error) {
        console.error(`Error fetching metrics from ${server.name}:`, error);
        setStatus((prev) => ({ ...prev, [server.name]: false }));
      }
    };

    const updateAllMetrics = async () => {
      setLoading(true);
      const promises = servers.map((server) => fetchMetrics(server));
      await Promise.allSettled(promises);
      setLoading(false);
    };

    updateAllMetrics();
    const interval = setInterval(updateAllMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  // Calcular estadísticas globales cuando cambien las métricas
  useEffect(() => {
    const onlineServers = Object.values(status).filter((v) => v).length;
    const offlineServers = Object.values(status).filter((v) => !v).length;

    // Calcular promedios solo de servidores online
    const onlineMetrics = Object.entries(metrics)
      .filter(([name]) => status[name])
      .map(([_, m]) => m);

    const avgCpu =
      onlineMetrics.length > 0
        ? onlineMetrics.reduce((sum, m) => sum + m.cpu, 0) /
          onlineMetrics.length
        : 0;

    const avgRam =
      onlineMetrics.length > 0
        ? onlineMetrics.reduce((sum, m) => sum + m.ram, 0) /
          onlineMetrics.length
        : 0;

    const avgDisk =
      onlineMetrics.length > 0
        ? onlineMetrics.reduce((sum, m) => sum + m.disk, 0) /
          onlineMetrics.length
        : 0;

    setGlobalStats({
      total: servers.length,
      online: onlineServers,
      offline: offlineServers,
      avgCpu,
      avgRam,
      avgDisk,
    });
  }, [metrics, status]);

  const filteredServers = servers.filter((server) =>
    server.name.toLowerCase().includes(search.toLowerCase())
  );

  const hasCriticalGlobal = Object.values(metrics).some(
    (m) => m.cpu >= 85 || m.ram >= 90 || m.disk >= 95
  );

  const criticalServers = Object.entries(metrics).filter(
    ([_, m]) => m.cpu >= 85 || m.ram >= 90 || m.disk >= 95
  );

  const criticalCount = criticalServers.length;

  const [hideHeader, setHideHeader] = useState(false);
  const lastScrollY = useRef(0);
  // =========================
  // 🚨 useEffect #3 → banner crítico
  // 👇 AQUÍ VA EXACTAMENTE 👇
  // =========================
  useEffect(() => {
    if (hasCriticalGlobal) {
      document.body.classList.add("has-critical-banner");
    } else {
      document.body.classList.remove("has-critical-banner");
    }
  }, [hasCriticalGlobal]);

  useEffect(() => {
    if (criticalRef.current && !hasScrolledToCritical) {
      criticalRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setHasScrolledToCritical(true);
    }
  }, [metrics, status, hasScrolledToCritical]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth > 768) return;

      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        setHideHeader(true); // bajando
      } else {
        setHideHeader(false); // subiendo
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // =========================
  // 🖼️ JSX
  // =========================
  return (
    <div className="dashboard">
      {hasCriticalGlobal && (
        <div
          className={`critical-halo-wrapper level-${Math.min(
            criticalCount,
            4
          )}`}
        >
          <div className="critical-halo red" />
          <div className="critical-halo orange" />
          <div className="critical-halo red intense" />
          <div className="critical-halo orange intense" />

          <div className="critical-text">
            ⚠️ ESTADO CRÍTICO ⚠️
            <span>
              sobrecarga de {criticalCount} server
              {criticalCount > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      <div className={`dashboard-header ${hideHeader ? "hide" : ""}`}>
        <div className="header-left">
          <h1 className="dashboard-title">
            <span className="dashboard-icon">🖥️</span>
            SERVER MONITORING DASHBOARD
          </h1>
          <p className="dashboard-subtitle">
            Monitoreo en tiempo real de servidores Windows/Linux
          </p>
        </div>

        <div className="search-container">
          <input
            type="text"
            placeholder="🔍 Buscar servidor por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Estadísticas Globales Compactas */}
      <div className="global-stats-compact">
        <div className="global-stats-row">
          <div className="compact-stat total">
            <div className="compact-stat-icon">📊</div>
            <div className="compact-stat-content">
              <div className="compact-stat-value">{globalStats.total}</div>
              <div className="compact-stat-label">Total</div>
            </div>
          </div>

          <div className="compact-stat online">
            <div className="compact-stat-icon">🟢</div>
            <div className="compact-stat-content">
              <div className="compact-stat-value">{globalStats.online}</div>
              <div className="compact-stat-label">Online</div>
              <div className="compact-stat-sub">
                {globalStats.total > 0
                  ? Math.round((globalStats.online / globalStats.total) * 100)
                  : 0}
                %
              </div>
            </div>
          </div>

          <div className="compact-stat offline">
            <div className="compact-stat-icon">🔴</div>
            <div className="compact-stat-content">
              <div className="compact-stat-value">{globalStats.offline}</div>
              <div className="compact-stat-label">Offline</div>
              <div className="compact-stat-sub">
                {globalStats.total > 0
                  ? Math.round((globalStats.offline / globalStats.total) * 100)
                  : 0}
                %
              </div>
            </div>
          </div>

          <div className="compact-stat cpu">
            <div className="compact-stat-icon">⚡</div>
            <div className="compact-stat-content">
              <div className="compact-stat-value">
                {globalStats.avgCpu.toFixed(1)}%
              </div>
              <div className="compact-stat-label">CPU Avg</div>
              <div className="compact-stat-sub">
                {globalStats.avgCpu > 70
                  ? "⚠️"
                  : globalStats.avgCpu > 40
                  ? "⚡"
                  : "✅"}
              </div>
            </div>
          </div>

          <div className="compact-stat ram">
            <div className="compact-stat-icon">🧠</div>
            <div className="compact-stat-content">
              <div className="compact-stat-value">
                {globalStats.avgRam.toFixed(1)}%
              </div>
              <div className="compact-stat-label">RAM Avg</div>
              <div className="compact-stat-sub">
                {globalStats.avgRam > 75
                  ? "⚠️"
                  : globalStats.avgRam > 50
                  ? "⚡"
                  : "✅"}
              </div>
            </div>
          </div>

          <div className="compact-stat disk">
            <div className="compact-stat-icon">💾</div>
            <div className="compact-stat-content">
              <div className="compact-stat-value">
                {globalStats.avgDisk.toFixed(1)}%
              </div>
              <div className="compact-stat-label">DISK Avg</div>
              <div className="compact-stat-sub">
                {globalStats.avgDisk > 80
                  ? "⚠️"
                  : globalStats.avgDisk > 60
                  ? "⚡"
                  : "✅"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && filteredServers.length === 0 && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Obteniendo métricas de servidores...</p>
        </div>
      )}

      <div className="server-grid">
        {filteredServers.map((server) => {
          const serverMetrics = metrics[server.name];
          const serverDetails = detailedMetrics[server.name];
          const isOnline = status[server.name];

          const cpuLevel =
            serverMetrics && getAlertLevel(serverMetrics.cpu, 70, 85);
          const ramLevel =
            serverMetrics && getAlertLevel(serverMetrics.ram, 75, 90);
          const diskLevel =
            serverMetrics && getAlertLevel(serverMetrics.disk, 80, 95);
          const hasCritical =
            cpuLevel === "critical" ||
            ramLevel === "critical" ||
            diskLevel === "critical";

          if (hasCritical) {
            document.body.classList.add("has-critical");
          } else {
            document.body.classList.remove("has-critical");
          }

          return (
            <div
              className="server-card"
              key={server.name}
              ref={hasCritical && !hasScrolledToCritical ? criticalRef : null}
            >
              <div className="server-header">
                <div className="server-title">
                  <h3>{server.name}</h3>
                  {serverDetails?.system && (
                    <span className="server-os">
                      {serverDetails.system.platform || "Unknown OS"}
                    </span>
                  )}
                </div>
                <div className="server-status">
                  <span
                    className={`status-badge ${
                      isOnline ? "online" : "offline"
                    }`}
                  >
                    {isOnline ? "🟢 ONLINE" : "🔴 OFFLINE"}
                  </span>
                  {serverDetails?.uptime && isOnline && (
                    <span className="uptime">
                      ⏱️ {formatUptime(serverDetails.uptime)}
                    </span>
                  )}
                </div>
              </div>

              {/* Métricas principales */}
              {serverMetrics && (
                <div className="metrics-summary">
                  <div className="metrics-grid">
                    <div className={`metric-card cpu ${cpuLevel}`}>
                      <div className="metric-header">
                        <span className="metric-icon">⚡</span>
                        <span className="metric-label">CPU</span>
                      </div>
                      <div className="metric-value">
                        {serverMetrics.cpu.toFixed(1)}%
                      </div>
                      {serverDetails?.cpu && (
                        <div className="metric-details">
                          <small>
                            {serverDetails.cpu.count || 1} Cores |
                            {serverDetails.cpu.frequency_current
                              ? ` ${(
                                  serverDetails.cpu.frequency_current / 1000
                                ).toFixed(1)} GHz`
                              : ""}
                          </small>
                        </div>
                      )}
                    </div>

                    <div className={`metric-card ram ${ramLevel}`}>
                      <div className="metric-header">
                        <span className="metric-icon">🧠</span>
                        <span className="metric-label">RAM</span>
                      </div>
                      <div className="metric-value">
                        {serverMetrics.ram.toFixed(1)}%
                      </div>
                      {serverDetails?.memory && (
                        <div className="metric-details">
                          <small>
                            {formatBytes(serverDetails.memory.used)} /{" "}
                            {formatBytes(serverDetails.memory.total)}
                          </small>
                        </div>
                      )}
                    </div>

                    <div className={`metric-card disk ${diskLevel}`}>
                      <div className="metric-header">
                        <span className="metric-icon">💾</span>
                        <span className="metric-label">DISK</span>
                      </div>
                      <div className="metric-value">
                        {serverMetrics.disk.toFixed(1)}%
                      </div>
                      {serverDetails?.disk && (
                        <div className="metric-details">
                          <small>
                            {serverDetails.disk.partitions?.length || 0}{" "}
                            partitions
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Información adicional si está disponible */}
              {serverDetails && isOnline && (
                <div className="detailed-info">
                  <div className="info-section">
                    <h4>📊 Información del Sistema</h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Hostname:</span>
                        <span className="info-value">
                          {serverDetails.system.hostname || "N/A"}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Arquitectura:</span>
                        <span className="info-value">
                          {serverDetails.system.architecture || "N/A"}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Procesador:</span>
                        <span
                          className="info-value"
                          title={serverDetails.system.processor || "N/A"}
                        >
                          {serverDetails.system.processor
                            ? serverDetails.system.processor.length > 30
                              ? serverDetails.system.processor.substring(
                                  0,
                                  30
                                ) + "..."
                              : serverDetails.system.processor
                            : "N/A"}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Python:</span>
                        <span className="info-value">
                          {serverDetails.system.python_version || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="info-section">
                    <h4>🌐 Red</h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Interfaces:</span>
                        <span className="info-value">
                          {
                            Object.keys(serverDetails.network?.interfaces || {})
                              .length
                          }
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Conexiones:</span>
                        <span className="info-value">
                          {serverDetails.network?.connections_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="info-section">
                    <h4>⚙️ Procesos</h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Total:</span>
                        <span className="info-value">
                          {serverDetails.processes?.total || 0}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Ejecutando:</span>
                        <span className="info-value">
                          {serverDetails.processes?.running_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Frame del servidor */}
              <div className="server-frame-container">
                <iframe
                  src={server.page}
                  title={`${server.name} Dashboard`}
                  className="server-frame"
                  scrolling="no"
                />
              </div>

              <div className="server-footer">
                <div className="footer-links">
                  <a
                    href={server.page}
                    target="_blank"
                    rel="noreferrer"
                    className="page-link"
                  >
                    🌐 Abrir Panel
                  </a>
                  <a
                    href={server.api}
                    target="_blank"
                    rel="noreferrer"
                    className="api-link"
                  >
                    📊 Ver API JSON
                  </a>
                </div>
                {serverDetails?.timestamp && (
                  <div className="last-update">
                    <small>
                      Actualizado:{" "}
                      {new Date(serverDetails.timestamp).toLocaleTimeString()}
                    </small>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredServers.length === 0 && !loading && (
        <div className="no-results">
          <p>No se encontraron servidores que coincidan con "{search}"</p>
        </div>
      )}

      <div className="dashboard-footer">
        <p>
          🔄 Actualización automática cada 5 segundos | 🕐 Última actualización:{" "}
          {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
