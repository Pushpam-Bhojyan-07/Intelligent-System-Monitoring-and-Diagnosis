import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import "./Dashboard.css";

function HistoricalAnalysis({ activePage, onNavigate }) {
    const [analysis, setAnalysis] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchAnalysis = () => {
            fetch("http://localhost:8000/api/analysis/processes")
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Historical analysis request failed");
                    }
                    return response.json();
                })
                .then((data) => {
                    setAnalysis(data);
                    setError("");
                })
                .catch((err) => {
                    console.error("Historical analysis fetch failed:", err);
                    setError(
                        "Historical analysis is unavailable. Check that the backend is running."
                    );
                });
        };

        fetchAnalysis();
        const interval = setInterval(fetchAnalysis, 30000);

        return () => clearInterval(interval);
    }, []);

    const candidates = analysis?.high_cpu_candidates ?? [];

    return (
        <div className="app-background">
            <div className="dashboard-layout">
                <Sidebar
                    activePage={activePage}
                    onNavigate={onNavigate}
                />

                <main className="main-content">
                    <Header
                        pageLabel="Analysis"
                        title="Historical Process Analysis"
                        description="Review historical process activity and resource usage"
                    />

                    <section className="historical-section">
                        <div className="section-header">
                            <h2>Historical Process Analysis</h2>
                            <p>
                                Review stored process metrics and identify
                                high-CPU candidates for further investigation.
                                A candidate is not necessarily a confirmed fault.
                            </p>
                        </div>

                        {error && (
                            <p className="analysis-error">{error}</p>
                        )}

                        {!analysis && !error && (
                            <p className="loading-message">
                                Loading historical analysis...
                            </p>
                        )}

                        {analysis && (
                            <>
                                <div className="historical-summary">
                                    <div className="historical-summary-card">
                                        <span>Records Retrieved</span>
                                        <strong>{analysis.records_retrieved}</strong>
                                    </div>

                                    <div className="historical-summary-card">
                                        <span>Processes Analyzed</span>
                                        <strong>{analysis.processes_analyzed}</strong>
                                    </div>

                                    <div className="historical-summary-card">
                                        <span>High-CPU Candidates</span>
                                        <strong>{candidates.length}</strong>
                                    </div>
                                </div>

                                <div className="historical-table-wrapper">
                                    <table className="process-table historical-table">
                                        <thead>
                                            <tr>
                                                <th>PID</th>
                                                <th>Process</th>
                                                <th>Samples</th>
                                                <th>Avg CPU</th>
                                                <th>Avg Memory</th>
                                                <th>High CPU</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {analysis.processes.map((process) => {
                                                const isCandidate = candidates.some(
                                                    (candidate) =>
                                                        candidate.pid === process.pid
                                                );

                                                return (
                                                    <tr
                                                        key={`${process.pid}-${process.process_name}`}
                                                    >
                                                        <td>{process.pid}</td>
                                                        <td>{process.process_name}</td>
                                                        <td>{process.total_samples}</td>
                                                        <td>
                                                            {Number(process.avg_cpu).toFixed(2)}%
                                                        </td>
                                                        <td>
                                                            {Number(process.avg_memory).toFixed(2)}%
                                                        </td>
                                                        <td>
                                                            {Number(
                                                                process.high_cpu_percentage
                                                            ).toFixed(2)}%
                                                        </td>
                                                        <td>
                                                            <span
                                                                className={
                                                                    isCandidate
                                                                        ? "analysis-status candidate"
                                                                        : "analysis-status normal"
                                                                }
                                                            >
                                                                {isCandidate
                                                                    ? "Investigate"
                                                                    : "No alert"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}

                                            {analysis.processes.length === 0 && (
                                                <tr>
                                                    <td colSpan="7">
                                                        No historical process records found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <p className="table-footnote">
                                    Showing the records returned by the current
                                    backend analysis. The table scrolls independently.
                                </p>
                            </>
                        )}
                    </section>
                </main>
            </div>
        </div>
    );
}

export default HistoricalAnalysis;