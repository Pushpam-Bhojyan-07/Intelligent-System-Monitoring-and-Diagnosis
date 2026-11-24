function Header({ pageLabel = "Overview", title = "System Overview", description = "Monitor your system performance and health" }) {
    return (
        <div className="dashboard-header">
            <div>
                <p className="page-label">{pageLabel}</p>
                <h1>{title}</h1>
                <p className="page-description">{description}</p>
            </div>
        </div>
    );
}

export default Header;