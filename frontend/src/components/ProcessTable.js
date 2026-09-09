function ProcessTable({ processes, formatBytes }) {
    return (
        <div className="process-section">

            <div className="section-header">
                <div>
                    <h2>Top CPU Processes</h2>
                    <p>Processes with the highest current CPU usage</p>
                </div>
            </div>

            <table className="process-table">
                <thead>
                    <tr>
                        <th>PID</th>
                        <th>Process</th>
                        <th>CPU</th>
                        <th>Memory</th>
                    </tr>
                </thead>

                <tbody>
                    {processes.map((process) => (
                        <tr key={process.pid}>
                            <td>{process.pid}</td>
                            <td>{process.name}</td>
                            <td>{process.cpu}%</td>
                            <td>{formatBytes(process.memory)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

        </div>
    );
}

export default ProcessTable;