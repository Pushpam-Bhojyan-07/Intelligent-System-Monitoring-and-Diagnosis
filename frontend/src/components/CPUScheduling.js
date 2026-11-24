
import { useEffect, useState } from "react";
import "./CPUScheduling.css";

const API_URL = "http://localhost:8000/api/scheduling";

const ALGORITHMS = [
    { value: "FCFS", label: "FCFS" },
    { value: "SJF", label: "SJF (Non-preemptive)" },
    { value: "Priority", label: "Priority (Non-preemptive)" },
    { value: "Round Robin", label: "Round Robin" },
];

function CPUScheduling() {
    const [algorithm, setAlgorithm] = useState("FCFS");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);

    async function fetchSchedulingResults() {
        setLoading(true);
        setError("");

        try {
            const response = await fetch(API_URL);

            if (!response.ok) {
                throw new Error(
                    `Backend request failed (${response.status}).`
                );
            }

            const result = await response.json();

            setData(result);
            setLastUpdated(new Date());
        } catch (err) {
            setError(
                err.message ||
                "Unable to load scheduling results. Check the backend."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchSchedulingResults();
    }, []);

    const selectedResult = data?.algorithms?.[algorithm];

    const format = (value) => {
        const number = Number(value);
        return Number.isFinite(number) ? number.toFixed(2) : "—";
    };

    const getAverages = (result) => {
        if (!result?.averages) {
            return null;
        }

        return {
            waiting: result.averages.average_waiting_time,
            turnaround: result.averages.average_turnaround_time,
            response: result.averages.average_response_time,
        };
    };

    const selectedAverages = getAverages(selectedResult);

    return (
        <section className="scheduling-section">
            <div className="scheduling-heading">
                <div>
                    <p className="scheduling-eyebrow">
                        OPERATING SYSTEMS
                    </p>

                    <h2>CPU Scheduling Analysis</h2>

                    <p>
                        Compare scheduling algorithms using monitored OS
                        processes and historical CPU data.
                    </p>
                </div>

                <span className="scheduling-tag">
                    Live Process Data
                </span>
            </div>

            <div className="scheduling-controls">
                <label>
                    Scheduling Algorithm

                    <select
                        value={algorithm}
                        onChange={(event) =>
                            setAlgorithm(event.target.value)
                        }
                        disabled={!data?.algorithms}
                    >
                        {ALGORITHMS.map((item) => (
                            <option
                                key={item.value}
                                value={item.value}
                            >
                                {item.label}
                            </option>
                        ))}
                    </select>
                </label>

                <div>
                    <button
                        className="run-simulation"
                        onClick={fetchSchedulingResults}
                        disabled={loading}
                    >
                        {loading ? "Refreshing..." : "Refresh Analysis"}
                    </button>

                    {lastUpdated && (
                        <p className="comparison-description">
                            Updated at {lastUpdated.toLocaleTimeString()}
                        </p>
                    )}
                </div>
            </div>

            {loading && !data && (
                <p>Loading live process scheduling analysis...</p>
            )}

            {error && (
                <div role="alert">
                    <p>{error}</p>
                    <button
                        className="add-process"
                        onClick={fetchSchedulingResults}
                        disabled={loading}
                    >
                        Try Again
                    </button>
                </div>
            )}

            {data && (
                <>
                    <p className="comparison-description">
                        {data.burst_time_note}
                    </p>

                    {data.processes?.length > 0 ? (
                        <>
                            <h3>Monitored Processes</h3>

                            <div className="scheduling-table-wrap">
                                <table className="scheduling-table">
                                    <thead>
                                        <tr>
                                            <th>PID</th>
                                            <th>Process Name</th>
                                            <th>Current CPU %</th>
                                            <th>Memory %</th>
                                            <th>Arrival Time</th>
                                            <th>Estimated Burst</th>
                                            <th>Priority</th>
                                            <th>History Samples</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {data.processes.map((process) => (
                                            <tr key={process.pid}>
                                                <td>{process.pid}</td>
                                                <td>{process.name}</td>
                                                <td>
                                                    {format(
                                                        process.observed_cpu_percent
                                                    )}
                                                </td>
                                                <td>
                                                    {format(
                                                        process.observed_memory_percent
                                                    )}
                                                </td>
                                                <td>{process.arrival_time}</td>
                                                <td>{process.burst_time}</td>
                                                <td>{process.priority}</td>
                                                <td>
                                                    {process.historical_samples}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {selectedResult && (
                                <div className="scheduling-results">
                                    <h3>
                                        {algorithm} Gantt Chart
                                    </h3>

                                    <p className="comparison-description">
                                        Timeline values represent simulated
                                        time units, not real elapsed execution
                                        time on macOS.
                                    </p>

                                    <div className="gantt-chart">
                                        {selectedResult.gantt_chart.map(
                                            (segment, index) => (
                                                <div
                                                    className={`gantt-segment ${
                                                        segment.process === "Idle"
                                                            ? "gantt-idle"
                                                            : ""
                                                    }`}
                                                    key={`${segment.process}-${segment.start}-${index}`}
                                                    style={{
                                                        flexGrow:
                                                            segment.end -
                                                            segment.start,
                                                        flexBasis: 0,
                                                        minWidth: "55px",
                                                    }}
                                                    title={`${segment.name || segment.process}: ${segment.start} to ${segment.end}`}
                                                >
                                                    <strong>
                                                        {segment.name ||
                                                            segment.process}
                                                    </strong>

                                                    <span>
                                                        {segment.start}–{segment.end}
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>

                                    {selectedAverages && (
                                        <div className="scheduling-summary">
                                            <div>
                                                <span>
                                                    Avg. Waiting Time
                                                </span>
                                                <strong>
                                                    {format(
                                                        selectedAverages.waiting
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>
                                                    Avg. Turnaround Time
                                                </span>
                                                <strong>
                                                    {format(
                                                        selectedAverages.turnaround
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>
                                                    Avg. Response Time
                                                </span>
                                                <strong>
                                                    {format(
                                                        selectedAverages.response
                                                    )}
                                                </strong>
                                            </div>
                                        </div>
                                    )}

                                    <h3>
                                        {algorithm} Process Results
                                    </h3>

                                    <div className="scheduling-table-wrap">
                                        <table className="scheduling-table">
                                            <thead>
                                                <tr>
                                                    <th>PID</th>
                                                    <th>Process Name</th>
                                                    <th>Burst</th>
                                                    <th>Start</th>
                                                    <th>Completion</th>
                                                    <th>Turnaround</th>
                                                    <th>Waiting</th>
                                                    <th>Response</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {selectedResult.processes.map(
                                                    (process) => (
                                                        <tr key={process.pid}>
                                                            <td>{process.pid}</td>
                                                            <td>{process.name}</td>
                                                            <td>{process.burst_time}</td>
                                                            <td>{process.start_time}</td>
                                                            <td>{process.completion_time}</td>
                                                            <td>{process.turnaround_time}</td>
                                                            <td>{process.waiting_time}</td>
                                                            <td>{process.response_time}</td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <h3>
                                        Algorithm Performance Comparison
                                    </h3>

                                    <p className="comparison-description">
                                        All algorithms use the same process
                                        snapshot and estimated burst times.
                                        Select an algorithm above to view its
                                        Gantt chart and process results.
                                    </p>

                                    <div className="scheduling-table-wrap">
                                        <table className="scheduling-table">
                                            <thead>
                                                <tr>
                                                    <th>Algorithm</th>
                                                    <th>Avg. Waiting</th>
                                                    <th>Avg. Turnaround</th>
                                                    <th>Avg. Response</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {ALGORITHMS.map((item) => {
                                                    const result =
                                                        data.algorithms[item.value];

                                                    const averages =
                                                        getAverages(result);

                                                    if (!averages) {
                                                        return null;
                                                    }

                                                    return (
                                                        <tr
                                                            key={item.value}
                                                            className={
                                                                item.value === algorithm
                                                                    ? "selected-algorithm"
                                                                    : ""
                                                            }
                                                        >
                                                            <td>
                                                                <strong>
                                                                    {item.label}
                                                                </strong>

                                                                {item.value ===
                                                                    algorithm && (
                                                                    <span className="selected-label">
                                                                        {" "}Selected
                                                                    </span>
                                                                )}
                                                            </td>

                                                            <td>
                                                                {format(averages.waiting)}
                                                            </td>
                                                            <td>
                                                                {format(averages.turnaround)}
                                                            </td>
                                                            <td>
                                                                {format(averages.response)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <p>
                            {data.message ||
                                "No matching live processes with sufficient historical data."}
                        </p>
                    )}
                </>
            )}
        </section>
    );
}

export default CPUScheduling;
