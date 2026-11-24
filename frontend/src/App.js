import { useState } from "react";
import Dashboard from "./Dashboard";
import HistoricalAnalysis from "./HistoricalAnalysis";
import CPUSchedulingPage from "./components/CPUSchedulingPage";
import MemoryAnalysisPage from "./components/MemoryAnalysisPage";

function App() {
    const [activePage, setActivePage] = useState("overview");

    if (activePage === "scheduling") {
        return (
            <CPUSchedulingPage
                activePage={activePage}
                onNavigate={setActivePage}
            />
        );
    }

    if (activePage === "analysis") {
        return (
            <HistoricalAnalysis
                activePage={activePage}
                onNavigate={setActivePage}
            />
        );
    }

    if (activePage === "memory") {
        return (
            <MemoryAnalysisPage
                activePage={activePage}
                onNavigate={setActivePage}
            />
        );
    }

    return (
        <Dashboard
            activePage={activePage}
            onNavigate={setActivePage}
        />
    );
}

export default App;
