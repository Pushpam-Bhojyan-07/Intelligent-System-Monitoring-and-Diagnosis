function SystemHealth({ systemStatus, metrics, highCpuProcesses }) {
    return (
        <aside className="right-panel">

            <div className="health-section">
                <h2>System Health</h2>
                <p className="health-subtitle">Current system status</p>

                <div className="health-overall">
                    <span className="health-dot"></span>
                    <span>
                        {systemStatus === "Healthy"
                            ? "System Healthy"
                            : "Attention Required"}
                    </span>
                </div>
            </div>

            <div className="health-section">
                <h3>Resource Status</h3>

                <div className="health-row">
                    <span>CPU</span>
                    <span className="health-value">
                        <span className="health-dot small"></span>
                        {metrics ? `${metrics.cpu}%` : "--"}
                    </span>
                </div>

                <div className="health-row">
                    <span>Memory</span>
                    <span className="health-value">
                        <span className="health-dot small"></span>
                        {metrics ? `${metrics.memory}%` : "--"}
                    </span>
                </div>

                <div className="health-row">
                    <span>Disk</span>
                    <span className="health-value">
                        <span className="health-dot small"></span>
                        {metrics ? `${metrics.disk}%` : "--"}
                    </span>
                </div>
            </div>

            <div className="health-section">
                <h3>Recent Alerts</h3>

                {highCpuProcesses.length === 0 ? (
                    <div className="no-alerts">
                        <span className="health-dot"></span>
                        <span>No active alerts</span>
                    </div>
                ) : (
                    <div className="right-alert">
                        <strong>High CPU usage</strong>

                        {highCpuProcesses.map((process) => (
                            <p key={process.pid}>
                                {process.name} — {process.cpu}%
                            </p>
                        ))}
                    </div>
                )}
            </div>

        </aside>
    );
}

export default SystemHealth;