import Sidebar from "./Sidebar";
import Header from "./Header";
import CPUScheduling from "./CPUScheduling";
import "./CPUSchedulingPage.css";

function CPUSchedulingPage({ activePage, onNavigate }) {
    return (
        <div className="app-background">
            <div className="dashboard-layout">
                <Sidebar
                    activePage={activePage}
                    onNavigate={onNavigate}
                />

                <main className="main-content">
                    <Header
                        pageLabel="CPU Scheduling"
                        title="CPU Scheduling Analysis"
                        description="Compare scheduling algorithms using monitored OS processes and historical CPU data."
                    />

                    <CPUScheduling />
                </main>
            </div>
        </div>
    );
}

export default CPUSchedulingPage;