import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import MetricCards from "./components/MetricCards";
import CpuChart from "./components/CpuChart";
import ProcessTable from "./components/ProcessTable";
import SystemHealth from "./components/SystemHealth";
import Header from "./components/Header";
import "./Dashboard.css";

function Dashboard() {
    const formatBytes = (bytes)=>{
        if(bytes == 0) return "0 Bytes";

        const units = ["Bytes", "KB", "MB", "GB", "TB"];
        const index = Math.floor(Math.log(bytes) / Math.log(1024));

        return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
    };

    const [metrics, setMetrics] = useState(null);
    const [processes, setProcesses] = useState([]);
    const [history, setHistory] = useState([]);

    useEffect(()=>{
        const fetchData = () =>{
                
            fetch("http://localhost:8000/api/metrics/latest")
                .then((response) => response.json())
                .then((data) =>{
                    setMetrics(data);
                })
                .catch((error) => {
                    console.error("Failed to fetch metrics: ", error);
                });

            fetch("http://localhost:8000/api/metrics/latest/processes")
                .then((response) => response.json())
                .then((data) => {
                    setProcesses(data);
                })
                .catch((error) => {
                    console.error("Failed to fetch the processes:", error);
                });

            fetch("http://localhost:8000/api/metrics/history")
                .then((response) => response.json())
                .then((data) => {
                    setHistory(data);
                })
                .catch((error) => {
                    console.error("Failed to fetch history:", error);
                });
        };
        fetchData();
        const interval = setInterval(fetchData, 5000);

        return () =>{
            clearInterval(interval);
        };

    }, []);

    let systemStatus = "Healthy";
    if(metrics && (
        metrics.cpu >= 80 ||
        metrics.memory >= 80 ||
        metrics.disk >= 90
    )){
        systemStatus = "Warning";
    }

    let highCpuProcesses = [];
    if(processes.length > 0){
        highCpuProcesses = processes.filter((process) => process.cpu >= 80);
    }

    return (
        <div className="app-background"> 
            <div className="dashboard-layout">

                <Sidebar/>

                <main className="main-content">
                    <Header />

                    {metrics && (
                        <>
                            <p className="last-updated">
                                Last updated:{" "}
                                {new Date(metrics.timestamp).toLocaleTimeString()}
                            </p>
                            <div className={`system-status ${systemStatus.toLowerCase()}`}>
                                <span className="status-dot"></span>
                                <span>System {systemStatus}</span>
                            </div>

                            {highCpuProcesses.length > 0 && (
                            <div className="process-alert">
                                <strong>High CPU Process Detected</strong>

                                {highCpuProcesses.map((process) => (
                                    <div key={process.pid} className="alert-process">
                                        {process.name} — {process.cpu}% CPU
                                    </div>
                                ))}
                            </div>
                            )}

                        <MetricCards
                                metrics={metrics}
                                processes={processes}
                                formatBytes={formatBytes}
                            />

                            <CpuChart history={history} />

                            <ProcessTable
                                processes={processes}
                                formatBytes={formatBytes}
                            />
                        </>
                    )}

                </main>

                <SystemHealth
                    systemStatus={systemStatus}
                    metrics={metrics}
                    highCpuProcesses={highCpuProcesses}
                />

            </div>
        </div>
    );
}
export default Dashboard;