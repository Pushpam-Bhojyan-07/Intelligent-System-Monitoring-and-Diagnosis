
function getCurrentMetrics(db) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT
                id,
                timestamp,
                cpu_usage,
                memory_usage,
                disk_usage,
                bytes_sent,
                bytes_received
            FROM system_metrics
            ORDER BY id DESC
            LIMIT 1
        `;

        db.query(query, (err, results) => {
            if (err) {
                return reject(err);
            }

            if (results.length === 0) {
                return resolve(null);
            }

            const metric = results[0];

            resolve({
                id: metric.id,
                timestamp: metric.timestamp,
                cpu: Number(metric.cpu_usage),
                memory: Number(metric.memory_usage),
                disk: Number(metric.disk_usage),
                network: {
                    bytes_sent: metric.bytes_sent,
                    bytes_received: metric.bytes_received
                }
            });
        });
    });
}


function getTopProcesses(db, metric = "cpu", limit = 5) {
    return new Promise((resolve, reject) => {
        const allowedMetrics = {
            cpu: "cpu_usage",
            memory: "memory_usage"
        };

        const column = allowedMetrics[metric];

        if (!column) {
            return reject(new Error("Invalid process metric."));
        }

        const query = `
            SELECT
                pid,
                process_name,
                cpu_usage,
                memory_usage
            FROM process_metrics
            WHERE system_metric_id = (
                SELECT id
                FROM system_metrics
                ORDER BY id DESC
                LIMIT 1
            )
            ORDER BY ${column} DESC
            LIMIT ?
        `;

        db.query(query, [limit], (err, results) => {
            if (err) {
                return reject(err);
            }

            const processes = results.map((process) => ({
                pid: process.pid,
                name: process.process_name,
                cpu: Number(process.cpu_usage),
                memory: Number(process.memory_usage)
            }));

            resolve(processes);
        });
    });
}


module.exports = {
    getCurrentMetrics,
    getTopProcesses
};
