function Header() {
    return (
        <div className="dashboard-header">

            <div>
                <p className="page-label">Overview</p>

                <h1>Good evening</h1>

                <p className="page-description">
                    Monitor your system performance and health
                </p>
            </div>

            <div className="header-actions">

                <div className="search-box">
                    Search
                </div>

                <div className="notification">
                    🔔
                </div>

            </div>

        </div>
    );
}

export default Header;