function Sidebar({ activePage, onNavigate }) {
const navigationItems = [
    { id: "overview", icon: "⌂", label: "Overview" },
    { id: "system", icon: "▣", label: "System" },
    { id: "processes", icon: "⚙", label: "Processes" },
    { id: "database", icon: "▤", label: "Database" },
    { id: "alerts", icon: "♧", label: "Alerts" },
    { id: "analysis", icon: "▥", label: "Historical Analysis" },
    { id: "scheduling", icon: "◷", label: "CPU Scheduling" },
    { id: "memory", icon: "▦", label: "Memory Analysis" },
];

const availablePages = [
    "overview",
    "analysis",
    "scheduling",
    "memory",
];


    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <span>◆</span>
                <h2>SysGuard</h2>
            </div>

            <nav className="sidebar-nav">
                {navigationItems.map((item) => {
                    const isAvailable = availablePages.includes(item.id);

                    return (
                        <button
                            type="button"
                            key={item.id}
                            className={`nav-item ${
                                activePage === item.id ? "active" : ""
                            }`}
                            onClick={() => {
                                if (isAvailable) {
                                    onNavigate(item.id);
                                }
                            }}
                            disabled={!isAvailable}
                            title={
                                isAvailable
                                    ? item.label
                                    : "This section is not available yet"
                            }
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="sidebar-bottom">
                <div className="nav-item">
                    <span>⚙</span>
                    <span>Settings</span>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;