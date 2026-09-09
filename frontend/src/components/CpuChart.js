import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";

function CpuChart({ history }) {
    return (
        <div className="cpu-chart-section">

            <div className="chart-header">
                <div>
                    <h2>CPU Usage History</h2>
                    <p>CPU utilization over the latest 20 snapshots</p>
                </div>
            </div>

            <div className="cpu-chart">
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={history}>

                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis
                            dataKey="timestamp"
                            tickFormatter={(timestamp) =>
                                new Date(timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false
                                })
                            }
                        />

                        <YAxis
                            tickFormatter={(value) => `${value}%`}
                        />

                        <Tooltip
                            labelFormatter={(timestamp) =>
                                new Date(timestamp).toLocaleTimeString()
                            }
                            formatter={(value) => [`${value}%`, "CPU"]}
                        />

                        <Line
                            type="monotone"
                            dataKey="cpu"
                            stroke="#9fc260"
                            strokeWidth={2}
                            dot={false}
                        />

                    </LineChart>
                </ResponsiveContainer>
            </div>

        </div>
    );
}

export default CpuChart;