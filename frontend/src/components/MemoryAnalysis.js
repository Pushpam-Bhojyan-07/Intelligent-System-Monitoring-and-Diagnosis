import "./MemoryAnalysis.css";
import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import "./MemoryAnalysis.css";

const API_BASE = "http://localhost:8000";
const REFRESH_INTERVAL = 5000;

function formatBytes(bytes = 0) {
  const value = Number(bytes);

  if (!Number.isFinite(value) || value < 0) return "0 B";
  if (value === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  );

  return `${(value / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
}

function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(1)}%` : "—";
}

function formatTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
}

function getUsageClass(value) {
  const percentage = Number(value);

  if (percentage >= 85) return "memory-critical";
  if (percentage >= 70) return "memory-warning";

  return "memory-normal";
}

function MetricCard({ title, value, subtitle, percentage }) {
  return (
    <div className="memory-metric-card">
      <div className="memory-metric-heading">
        <span>{title}</span>

        {percentage !== undefined && (
          <span className={`memory-status ${getUsageClass(percentage)}`}>
            {formatPercent(percentage)}
          </span>
        )}
      </div>

      <div className="memory-metric-value">{value}</div>

      {subtitle && (
        <div className="memory-metric-subtitle">{subtitle}</div>
      )}

      {percentage !== undefined && (
        <div className="memory-progress-track">
          <div
            className={`memory-progress-fill ${getUsageClass(percentage)}`}
            style={{
              width: `${Math.min(
                100,
                Math.max(0, Number(percentage) || 0)
              )}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

function MemoryAnalysis() {
  const [memory, setMemory] = useState(null);
  const [history, setHistory] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [processHistory, setProcessHistory] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchMemoryData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    }

    try {
      setError("");

      const [
        liveResponse,
        historyResponse,
        processHistoryResponse,
      ] = await Promise.all([
        fetch(`${API_BASE}/api/analysis/memory/live`),
        fetch(`${API_BASE}/api/metrics/history`),
        fetch(`${API_BASE}/api/analysis/memory/process-history?limit=100`),
      ]);

      if (!liveResponse.ok) {
        throw new Error("Unable to fetch live memory metrics.");
      }

      if (!historyResponse.ok) {
        throw new Error("Unable to fetch historical memory metrics.");
      }

      if (!processHistoryResponse.ok) {
        throw new Error("Unable to fetch historical process memory.");
      }

      const liveData = await liveResponse.json();
      const historyData = await historyResponse.json();
      const processHistoryData = await processHistoryResponse.json();

      setMemory(liveData);

      const validHistory = Array.isArray(historyData)
        ? historyData
        : [];

      setHistory(
        validHistory.map((item) => ({
          ...item,
          time: formatTime(item.timestamp),
          ram: Number(item.memory),
          cpu: Number(item.cpu),
          disk: Number(item.disk),
        }))
      );

      setProcesses(
        Array.isArray(liveData.processes)
          ? liveData.processes
          : []
      );

      setProcessHistory(
        Array.isArray(processHistoryData.history)
          ? processHistoryData.history
          : []
      );

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Memory analysis request failed:", err);

      setError(
        err.message ||
          "Could not load memory information. Check that the backend is running."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMemoryData();

    const intervalId = setInterval(() => {
      fetchMemoryData();
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [fetchMemoryData]);

  const ramPercent = Number(memory?.ram?.percent ?? 0);
  const swapPercent = Number(memory?.swap?.percent ?? 0);

  const processOptions = [
    ...new Map(
      processHistory.map((item) => [
        String(item.pid),
        {
          pid: String(item.pid),
          name: item.name || "Unknown",
        },
      ])
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const filteredProcessHistory =
    selectedProcess === "all"
      ? processHistory
      : processHistory.filter(
          (item) => String(item.pid) === selectedProcess
        );

  // The endpoint returns history in chronological order.
  const processChartData = filteredProcessHistory.map((item) => ({
    ...item,
    time: formatTime(item.timestamp),
    memory: Number(item.memory_percent),
    cpu: Number(item.cpu_percent),
  }));

  return (
    <div className="memory-analysis">
      <div className="memory-page-header">
        <div>
          <h2>Memory Analysis</h2>
          <p>
            Live RAM utilization, swap usage, process memory consumption,
            and historical trends.
          </p>
        </div>

        <button
          type="button"
          className="memory-refresh-button"
          onClick={() => fetchMemoryData(true)}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="memory-live-status">
        <span className="memory-live-dot" />
        Live monitoring · Refreshes every 5 seconds

        {lastUpdated && (
          <span className="memory-updated-time">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <div className="memory-error-message">
          <strong>Unable to load memory data</strong>
          <p>{error}</p>

          <button
            type="button"
            className="memory-refresh-button"
            onClick={() => fetchMemoryData(true)}
            disabled={refreshing}
          >
            Try again
          </button>
        </div>
      )}

      {loading && !memory ? (
        <div className="memory-loading">
          <div className="memory-loader" />
          <p>Loading live memory metrics...</p>
        </div>
      ) : memory ? (
        <>
          {/* Physical RAM */}
          <section className="memory-section">
            <div className="memory-section-heading">
              <h3>Physical Memory (RAM)</h3>
              <span className="memory-section-note">
                Current system-wide usage
              </span>
            </div>

            <div className="memory-metric-grid">
              <MetricCard
                title="Total RAM"
                value={formatBytes(memory.ram?.total_bytes)}
                subtitle="Installed physical memory"
              />

              <MetricCard
                title="Used RAM"
                value={formatBytes(memory.ram?.used_bytes)}
                subtitle={`${formatPercent(ramPercent)} of total RAM`}
                percentage={ramPercent}
              />

              <MetricCard
                title="Available RAM"
                value={formatBytes(memory.ram?.available_bytes)}
                subtitle="Memory currently available to applications"
              />

              <MetricCard
                title="RAM Utilization"
                value={formatPercent(ramPercent)}
                subtitle="Current physical memory utilization"
                percentage={ramPercent}
              />
            </div>
          </section>

          
          <section className="memory-section">
            <div className="memory-section-heading">
              <h3>Swap Memory</h3>
              <span className="memory-section-note">
                Virtual memory backed by disk
              </span>
            </div>

            <div className="memory-metric-grid">
              <MetricCard
                title="Total Swap"
                value={formatBytes(memory.swap?.total_bytes)}
                subtitle="Configured swap capacity"
              />

              <MetricCard
                title="Used Swap"
                value={formatBytes(memory.swap?.used_bytes)}
                subtitle={`${formatPercent(swapPercent)} of total swap`}
                percentage={swapPercent}
              />

              <MetricCard
                title="Free Swap"
                value={formatBytes(memory.swap?.free_bytes)}
                subtitle="Currently unused swap space"
              />

              <MetricCard
                title="Swap Utilization"
                value={formatPercent(swapPercent)}
                subtitle="Current swap usage"
                percentage={swapPercent}
              />
            </div>
          </section>

          <section className="memory-section">
            <div className="memory-section-heading">
              <h3>RAM Usage Breakdown</h3>
              <span className="memory-section-note">
                Current memory allocation
              </span>
            </div>

            <div className="memory-breakdown-card">
              <div className="memory-breakdown-header">
                <div>
                  <span className="memory-muted-label">Used</span>
                  <strong>{formatBytes(memory.ram?.used_bytes)}</strong>
                </div>

                <div>
                  <span className="memory-muted-label">Available</span>
                  <strong>
                    {formatBytes(memory.ram?.available_bytes)}
                  </strong>
                </div>
              </div>

              <div className="memory-stacked-track">
                <div
                  className="memory-stacked-used"
                  style={{
                    width: `${Math.min(100, Math.max(0, ramPercent))}%`,
                  }}
                />

                <div
                  className="memory-stacked-available"
                  style={{
                    width: `${100 - Math.min(100, Math.max(0, ramPercent))}%`,
                  }}
                />
              </div>

              <div className="memory-chart-legend">
                <span>
                  <i className="memory-legend-used" />
                  Used memory
                </span>

                <span>
                  <i className="memory-legend-available" />
                  Available memory
                </span>
              </div>
            </div>
          </section>

          
          <section className="memory-section">
            <div className="memory-section-heading">
              <h3>Historical Memory Trend</h3>
              <span className="memory-section-note">
                Latest saved system snapshots
              </span>
            </div>

            <div className="memory-chart-card">
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={history}
                    margin={{
                      top: 10,
                      right: 20,
                      left: 0,
                      bottom: 5,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="ramUsageGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#4776e6"
                          stopOpacity={0.28}
                        />
                        <stop
                          offset="95%"
                          stopColor="#4776e6"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e7eaf0"
                    />

                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11, fill: "#697386" }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fontSize: 11, fill: "#697386" }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip
                      formatter={(value) => [
                        `${Number(value).toFixed(1)}%`,
                        "RAM usage",
                      ]}
                      labelFormatter={(label) => `Time: ${label}`}
                    />

                    <Area
                      type="monotone"
                      dataKey="ram"
                      name="RAM usage"
                      stroke="#4776e6"
                      strokeWidth={2.5}
                      fill="url(#ramUsageGradient)"
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="memory-empty-state">
                  <p>No historical snapshots are available yet.</p>
                  <span>
                    Historical data will appear after system metrics have
                    been saved to the database.
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Overall system trends */}
          <section className="memory-section">
            <div className="memory-section-heading">
              <h3>System Resource Trends</h3>
              <span className="memory-section-note">
                CPU, RAM, and disk usage from saved snapshots
              </span>
            </div>

            <div className="memory-chart-card">
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={history}
                    margin={{
                      top: 10,
                      right: 20,
                      left: 0,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e7eaf0"
                    />

                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11, fill: "#697386" }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fontSize: 11, fill: "#697386" }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip
                      formatter={(value) =>
                        `${Number(value).toFixed(1)}%`
                      }
                    />

                    <Legend />

                    <Line
                      type="monotone"
                      dataKey="ram"
                      name="RAM"
                      stroke="#4776e6"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />

                    <Line
                      type="monotone"
                      dataKey="cpu"
                      name="CPU"
                      stroke="#16a085"
                      strokeWidth={2}
                      dot={false}
                    />

                    <Line
                      type="monotone"
                      dataKey="disk"
                      name="Disk"
                      stroke="#e5a23c"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="memory-empty-state">
                  <p>No resource history available.</p>
                </div>
              )}
            </div>
          </section>

          
          <section className="memory-section">
            <div className="memory-section-heading">
              <h3>Top Memory-Consuming Processes</h3>
              <span className="memory-section-note">
                Live process snapshot · Top 10 by RAM usage
              </span>
            </div>

            <div className="memory-process-card">
              {processes.length > 0 ? (
                <div className="memory-table-wrapper">
                  <table className="memory-process-table">
                    <thead>
                      <tr>
                        <th>PID</th>
                        <th>Process Name</th>
                        <th>RAM Usage</th>
                        <th>Memory %</th>
                      </tr>
                    </thead>

                    <tbody>
                      {processes.map((process, index) => (
                        <tr key={`${process.pid}-${index}`}>
                          <td>{process.pid ?? "—"}</td>
                          <td className="memory-process-name">
                            {process.name || "Unknown"}
                          </td>
                          <td>{formatBytes(process.memory_bytes)}</td>
                          <td>
                            <span
                              className={`memory-process-percent ${
                                Number(process.memory_percent) >= 10
                                  ? "memory-warning"
                                  : "memory-normal"
                              }`}
                            >
                              {formatPercent(process.memory_percent)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="memory-empty-state">
                  <p>No process memory data returned.</p>
                  <span>
                    Check the live memory API and process permissions.
                  </span>
                </div>
              )}
            </div>
          </section>

          
          <section className="memory-section">
            <div className="memory-section-heading">
              <h3>Historical Process Memory</h3>
              <span className="memory-section-note">
                Saved process-level snapshots
              </span>
            </div>

            <div className="memory-history-controls">
              <label htmlFor="process-history-select">
                Select process
              </label>

              <select
                id="process-history-select"
                value={selectedProcess}
                onChange={(event) =>
                  setSelectedProcess(event.target.value)
                }
              >
                <option value="all">All recorded processes</option>

                {processOptions.map((process) => (
                  <option key={process.pid} value={process.pid}>
                    {process.name} (PID {process.pid})
                  </option>
                ))}
              </select>

              <span className="memory-history-count">
                {filteredProcessHistory.length} records loaded
              </span>
            </div>

            <div className="memory-chart-card">
              {processChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart
                    data={processChartData}
                    margin={{
                      top: 10,
                      right: 20,
                      left: 0,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e7eaf0"
                    />

                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 10, fill: "#697386" }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fontSize: 11, fill: "#697386" }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip
                      labelFormatter={(label) => `Time: ${label}`}
                      formatter={(value, name) => [
                        `${Number(value).toFixed(2)}%`,
                        name,
                      ]}
                    />

                    <Legend />

                    <Line
                      type="monotone"
                      dataKey="memory"
                      name="Memory usage"
                      stroke="#4776e6"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />

                    {selectedProcess !== "all" && (
                      <Line
                        type="monotone"
                        dataKey="cpu"
                        name="CPU usage"
                        stroke="#16a085"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="memory-empty-state">
                  <p>No historical process records available.</p>
                  <span>
                    Start the monitoring loop and ensure process snapshots
                    are being saved to the database.
                  </span>
                </div>
              )}
            </div>

            <div className="memory-process-card">
              <div className="memory-table-wrapper">
                <table className="memory-process-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Process</th>
                      <th>PID</th>
                      <th>Memory %</th>
                      <th>CPU %</th>
                      <th>Snapshot</th>
                    </tr>
                  </thead>

                  <tbody>
                    {[...filteredProcessHistory]
                      .reverse()
                      .map((item, index) => (
                        <tr
                          key={`${item.snapshot_id}-${item.pid}-${index}`}
                        >
                          <td>{formatDateTime(item.timestamp)}</td>

                          <td className="memory-process-name">
                            {item.name || "Unknown"}
                          </td>

                          <td>{item.pid ?? "—"}</td>
                          <td>{formatPercent(item.memory_percent)}</td>
                          <td>{formatPercent(item.cpu_percent)}</td>
                          <td>{item.snapshot_id ?? "—"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {filteredProcessHistory.length === 0 && (
                  <div className="memory-empty-state">
                    No records match this process.
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      ) : (
        !error && (
          <div className="memory-empty-state">
            <p>Memory metrics are not available.</p>
          </div>
        )
      )}
    </div>
  );
}

export default MemoryAnalysis;
