import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import DiagnosisPanel from "./DiagnosisPanel";
import "../Dashboard.css";

function DiagnosisPage({ activePage, onNavigate }) {
    const [diagnosis, setDiagnosis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;

        const fetchDiagnosis = () => {
            fetch("http://localhost:8000/api/analysis/diagnosis")
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Failed to fetch diagnosis report");
                    }
                    return response.json();
                })
                .then((data) => {
                    if (isMounted) {
                        setDiagnosis(data);
                        setError("");
                        setLoading(false);
                    }
                })
                .catch((err) => {
                    if (isMounted) {
                        setError(err.message);
                        setLoading(false);
                    }
                });
        };

        fetchDiagnosis();

        const interval = setInterval(fetchDiagnosis, 15000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="app-background">
            <div className="dashboard-layout">
                <Sidebar
                    activePage={activePage}
                    onNavigate={onNavigate}
                />

                <main className="main-content">
                    <Header
                        pageLabel="Diagnosis"
                        title="Diagnosis & Alerts"
                        description="Identify system performance issues and possible OS-DBMS relationships"
                    />

                    <DiagnosisPanel
                        report={diagnosis}
                        loading={loading}
                        error={error}
                    />
                </main>
            </div>
        </div>
    );
}

export default DiagnosisPage;