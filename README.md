# SysGuard

## Intelligent System Monitoring and Diagnosis

SysGuard is a system monitoring and diagnosis platform designed to monitor operating system performance, store performance data, visualize system health, and provide a foundation for identifying performance bottlenecks.

The current implementation focuses on OS-level monitoring using Python and psutil. System metrics are stored in MySQL, exposed through a Node.js/Express REST API, and displayed through a React dashboard.

---

## Features

### Current Features

- CPU usage monitoring
- Memory/RAM usage monitoring
- Disk usage monitoring
- Network bytes sent and received
- Process-level CPU monitoring
- Process-level memory monitoring
- Top CPU-consuming processes
- Top memory-consuming processes
- Historical system metrics
- MySQL-based metric storage
- REST APIs for metric retrieval
- React-based monitoring dashboard
- CPU usage visualization
- System health information
- High CPU usage alerts

### Planned Features

- Database performance monitoring
- Historical performance analysis
- Improved alerting
- Bottleneck detection
- OS and database performance correlation
- System diagnosis
- Natural-language performance queries using NLP

---

## System Architecture

```text
+----------------------+
|   Operating System   |
| CPU | RAM | Disk     |
| Network | Processes  |
+----------+-----------+
           |
           v
+----------------------+
| Python OS Monitor    |
| Python + psutil      |
+----------+-----------+
           |
           v
+----------------------+
|       MySQL          |
|   system_metrics     |
|   process_metrics    |
+----------+-----------+
           ^
           |
+----------+-----------+
| Node.js + Express    |
|      REST API        |
+----------+-----------+
           |
           v
+----------------------+
| React Dashboard      |
| Charts | Metrics     |
| Processes | Health   |
+----------------------+