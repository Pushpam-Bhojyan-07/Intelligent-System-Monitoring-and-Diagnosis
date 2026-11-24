function MetricCards({ metrics, processes, formatBytes }) {
    return (
        <div className="metrics-container">

            <div className="metric-card">
                <h3>CPU Usage</h3>
                <p>{metrics.cpu}%</p>
            </div>

            <div className="metric-card">
                <h3>Memory Usage</h3>
                <p>{metrics.memory}%</p>
            </div>

            <div className="metric-card">
                <h3>Disk Usage</h3>
                <p>{metrics.disk}%</p>
            </div>

            <div className="metric-card">
                <h3>Network Sent</h3>
                <p>{formatBytes(metrics.network.bytes_sent)}</p>
            </div>

            <div className="metric-card">
                <h3>Network Received</h3>
                <p>{formatBytes(metrics.network.bytes_received)}</p>
            </div>

            <div className="metric-card">
                <h3>Active Processes</h3>
                <p>{processes.length}</p>
            </div>

        </div>
    );
}

export default MetricCards;