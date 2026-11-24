function DiagnosisPanel({ report, loading, error }) {
    if (loading) {
        return (
            <div className="diagnosis-loading">
                Loading diagnosis report...
            </div>
        );
    }

    if (error) {
        return (
            <div className="diagnosis-error">
                <h3>Unable to Load Diagnosis</h3>
                <p>{error}</p>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="diagnosis-empty">
                No diagnosis report available.
            </div>
        );
    }

    const {
        total_matched_intervals = 0,
        intervals_with_detected_issues = 0,
        diagnoses = [],
        sustained_alerts = [],
        metric_summary = {},
    } = report;

    const hasIssues =
        diagnoses.length > 0 || sustained_alerts.length > 0;

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return "Timestamp unavailable";

        const date = new Date(timestamp);

        if (Number.isNaN(date.getTime())) {
            return timestamp;
        }

        return date.toLocaleString();
    };

    const formatMetric = (value, suffix = "") => {
        return `${Number(value ?? 0).toFixed(2)}${suffix}`;
    };

    return (
        <section className="diagnosis-container">

            {/* Report Overview */}
            <div className="diagnosis-overview">
                <div className="diagnosis-overview-card">
                    <span>Total Matched Intervals</span>
                    <h2>{total_matched_intervals}</h2>
                </div>

                <div className="diagnosis-overview-card">
                    <span>Intervals With Issues</span>
                    <h2>{intervals_with_detected_issues}</h2>
                </div>

                <div className="diagnosis-overview-card">
                    <span>Detected Issues</span>
                    <h2>{diagnoses.length}</h2>
                </div>

                <div className="diagnosis-overview-card">
                    <span>Sustained Alerts</span>
                    <h2>{sustained_alerts.length}</h2>
                </div>
            </div>

            {/* Metric Summary */}
            <div className="diagnosis-section">
                <h3>Performance Summary</h3>

                <div className="diagnosis-metric-grid">
                    <div className="diagnosis-metric-card">
                        <span>Maximum CPU Usage</span>
                        <h2>
                            {formatMetric(metric_summary.max_cpu, "%")}
                        </h2>
                    </div>

                    <div className="diagnosis-metric-card">
                        <span>Maximum Memory Usage</span>
                        <h2>
                            {formatMetric(metric_summary.max_memory, "%")}
                        </h2>
                    </div>

                    <div className="diagnosis-metric-card">
                        <span>Maximum Query Latency</span>
                        <h2>
                            {formatMetric(
                                metric_summary.max_query_latency,
                                " ms"
                            )}
                        </h2>
                    </div>

                    <div className="diagnosis-metric-card">
                        <span>Maximum Query Executions</span>
                        <h2>
                            {metric_summary.max_query_executions ?? 0}
                        </h2>
                    </div>
                </div>
            </div>

            {/* Detected Issues */}
            <div className="diagnosis-section">
                <h3>Detected Issues</h3>


                {diagnoses.length === 0 ? (
                    <div className="diagnosis-empty">
                        <h4>No Interval-Level Issues Detected</h4>
                        <p>
                            No performance issues were detected in the analyzed
                            intervals using the configured thresholds.
                        </p>
                    </div>
                ) : (
                    <div className="diagnosis-list">
                        {diagnoses.map((interval, index) => (
                            <div className="diagnosis-card" key={index}>
                                <h4>
                                    Interval: {formatTimestamp(interval.interval_start)}
                                </h4>

                                {interval.issues.map((item, issueIndex) => (
                                    <div key={issueIndex}>
                                        <div className="diagnosis-card-header">
                                            <strong>{item.issue}</strong>
                                            <span className={`severity-badge ${
                                                (item.severity || "medium").toLowerCase()
                                            }`}>
                                                {item.severity}
                                            </span>
                                        </div>

                                        <p>{item.message}</p>

                                        <div className="diagnosis-recommendation">
                                            <strong>Recommendation:</strong>
                                            <p>{item.recommendation}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Sustained Alerts */}
            <div className="diagnosis-section">
                <h3>Sustained Alerts</h3>

                {sustained_alerts.length === 0 ? (
                    <div className="diagnosis-empty">
                        <h4>No Sustained Alerts</h4>
                        <p>
                            No metrics remained above their configured
                            thresholds for the required consecutive intervals.
                        </p>
                    </div>
                ) : (
                    <div className="diagnosis-list">
                        {sustained_alerts.map((alert, index) => (
                            <div
                                className="diagnosis-card sustained-alert-card"
                                key={`${alert.issue || "alert"}-${index}`}
                            >
                                <div className="diagnosis-card-header">
                                    <h4>
                                        {alert.issue || "Sustained Alert"}
                                    </h4>

                                    <span className="severity-badge critical">
                                        {alert.severity || "Critical"}
                                    </span>
                                </div>

                                <p className="diagnosis-message">
                                    {alert.message}
                                </p>

                                {alert.recommendation && (
                                    <div className="diagnosis-recommendation">
                                        <strong>Recommendation:</strong>
                                        <p>{alert.recommendation}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Overall Status */}
            <div className={`diagnosis-status ${
                hasIssues ? "warning" : "healthy"
            }`}>
                <strong>
                    {hasIssues
                        ? "Performance Issues Detected"
                        : "System Operating Within Configured Thresholds"}
                </strong>

                <p>
                    {hasIssues
                        ? "Review the detected issues and recommendations above."
                        : "No interval-level issues or sustained alerts were detected in the analyzed data."}
                </p>
            </div>

        </section>
    );
}

export default DiagnosisPanel;