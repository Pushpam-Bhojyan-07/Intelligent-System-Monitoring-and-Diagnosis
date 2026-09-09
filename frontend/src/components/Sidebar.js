function Sidebar() {
    return (
        <aside className="sidebar">

            <div className="sidebar-logo">
                <span>◆</span>
                <h2>SysGuard</h2>
            </div>

            <nav className="sidebar-nav">

                <div className="nav-item active">
                    <span>⌂</span>
                    <span>Overview</span>
                </div>

                <div className="nav-item">
                    <span>▣</span>
                    <span>System</span>
                </div>

                <div className="nav-item">
                    <span>⚙</span>
                    <span>Processes</span>
                </div>

                <div className="nav-item">
                    <span>▤</span>
                    <span>Database</span>
                </div>

                <div className="nav-item">
                    <span>♧</span>
                    <span>Alerts</span>
                </div>

                <div className="nav-item">
                    <span>▥</span>
                    <span>Analysis</span>
                </div>

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