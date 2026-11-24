
import Sidebar from "./Sidebar";
import Header from "./Header";
import MemoryAnalysis from "./MemoryAnalysis";
import "./MemoryAnalysisPage.css";

function MemoryAnalysisPage({ activePage, onNavigate }) {
    return (
        <div className="app-background">
            <div className="dashboard-layout">
                <Sidebar
                    activePage={activePage}
                    onNavigate={onNavigate}
                />

                <main className="main-content">
                    <Header
                        pageLabel="Memory Analysis"
                        title="Memory Management Analysis"
                        description="Compare FIFO, LRU, and Optimal page replacement algorithms."
                    />

                    <MemoryAnalysis />
                </main>
            </div>
        </div>
    );
}

export default MemoryAnalysisPage;
