CREATE DATABASE IF NOT EXISTS sysguard;

USE sysguard;

CREATE TABLE IF NOT EXISTS system_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    disk_usage DECIMAL(5,2),
    bytes_sent BIGINT,
    bytes_received BIGINT
);

CREATE TABLE IF NOT EXISTS process_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    system_metric_id INT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    pid INT,
    process_name VARCHAR(255),
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    FOREIGN KEY (system_metric_id)
        REFERENCES system_metrics(id)
);