const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
require("dotenv").config({ path: "../.env" });
const { execFile } = require("child_process");
const path = require("path");

const app = express()
app.use(cors());

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

db.connect((err)=>{
    if(err){
        console.log("MySQL connection failed!", err);
        return;
    }
    console.log("Connected to sysguard database!");
});

const PORT = 8000;

app.get("/", (req, res)=>{
    res.json({
        message: "Sysguard backend is running!"
    });
});


app.get("/api/metrics/latest", (req, res)=>{
    const query = `SELECT * FROM system_metrics ORDER BY id DESC LIMIT 1`;

    db.query(query, (err, results)=>{
        if(err){
            console.error("Database query failed!", err);
            return res.status(500).json({
                error: "Failed to fetch system metrics!"
            });
        }
        const metric = results[0];
        res.json({
            id: metric.id,
            timestamp: metric.timestamp,
            cpu: Number(metric.cpu_usage),
            memory: Number(metric.memory_usage),
            disk: Number(metric.disk_usage),
            network: {
                bytes_sent: metric.bytes_sent,
                bytes_received: metric.bytes_received,
            }
        });
    });
});

app.get("/api/metrics/latest/processes", (req, res)=>{
    const query =  `SELECT * 
                    FROM process_metrics 
                    WHERE system_metric_id = (
                        SELECT id FROM system_metrics ORDER BY id DESC LIMIT 1
                    ) 
                    ORDER BY cpu_usage DESC`;

    db.query(query, (err, results)=>{
        if(err){
            console.error("Process query failed: ", err);
            return res.status(500).json({
                error: "Failed to fetch process metrics"
            });
        }

        const processes = results.map((process) => ({
            pid: process.pid,
            name: process.process_name,
            cpu: Number(process.cpu_usage),
            memory: Number(process.memory_usage)
        }));
        res.json(processes);
    });
});

app.get("/api/metrics/history", (req, res)=>{
    const query = `SELECT timestamp, cpu_usage, memory_usage, disk_usage FROM system_metrics ORDER BY timestamp DESC LIMIT 20`;

    db.query(query, (err, results) => {
        if(err){
            console.error("Historical metrics query failed:", err);
            return res.status(500).json({
                error: "Failed to fetch historical metrics"
            });
        }

        const metrics = results.map((metric) => ({
            timestamp: metric.timestamp,
            cpu: Number(metric.cpu_usage),
            memory: Number(metric.memory_usage),
            disk: Number(metric.disk_usage)
        }));
        res.json(metrics.reverse());
    });
});


app.get("/api/analysis/processes", (req, res) => {
    const projectRoot = path.resolve(__dirname, "..");
    const pythonPath = path.join(projectRoot, ".venv", "bin", "python");
    const scriptPath = path.join(
        projectRoot,
        "analysis",
        "os",
        "historical_analysis.py"
    );

    execFile(
        pythonPath,
        ["-m", "analysis.os.historical_analysis", "--json"],
        {
            cwd: projectRoot,
            timeout: 15000,
            maxBuffer: 2 * 1024 * 1024
        },
        (error, stdout, stderr) => {
            if (error) {
                console.error("Historical analysis failed:", stderr || error.message);

                return res.status(500).json({
                    error: "Failed to run historical process analysis."
                });
            }

            try {
                const analysis = JSON.parse(stdout);
                return res.json(analysis);
            } catch (parseError) {
                console.error("Invalid analysis JSON:", parseError.message);

                return res.status(500).json({
                    error: "Historical analysis returned invalid JSON."
                });
            }
        }
    );
});


app.get("/api/scheduling", (req, res) => {
    const projectRoot = path.resolve(__dirname, "..");
    const pythonPath = path.join(
        projectRoot,
        ".venv",
        "bin",
        "python"
    );

    execFile(
        pythonPath,
        ["-m", "analysis.os.system_scheduling", "--json"],
        {
            cwd: projectRoot,
            timeout: 20000,
            maxBuffer: 2 * 1024 * 1024
        },
        (error, stdout, stderr) => {
            if (error) {
                console.error(
                    "CPU scheduling failed:",
                    stderr || error.message
                );

                return res.status(500).json({
                    error: "Failed to generate CPU scheduling results."
                });
            }

            try {
                return res.json(JSON.parse(stdout));
            } catch (parseError) {
                console.error(
                    "Invalid scheduling JSON:",
                    parseError.message
                );

                return res.status(500).json({
                    error: "CPU scheduling returned invalid JSON."
                });
            }
        }
    );
});

app.get("/api/analysis/memory", (req, res) => {
    const projectRoot = path.resolve(__dirname, "..");
    const pythonPath = path.join(projectRoot, ".venv", "bin", "python");

    const pagesParam = req.query.pages || "7,0,1,2,0,3,0,4,2,3,0,3,2";
    const framesParam = Number(req.query.frames || 3);

    const pages = pagesParam.split(",").map(Number);

    if (
        pages.length === 0 ||
        pages.some((page) => !Number.isInteger(page) || page < 0) ||
        !Number.isInteger(framesParam) ||
        framesParam <= 0
    ) {
        return res.status(400).json({
            error: "Provide valid non-negative page numbers and a positive frame count."
        });
    }

    const pythonCode = `
    import json
    from analysis.os.memory_analysis import compare_page_replacement

    pages = ${JSON.stringify(pages)}
    frame_count = ${framesParam}

    print(json.dumps(compare_page_replacement(pages, frame_count)))
    `;

    execFile(
        pythonPath,
        ["-c", pythonCode],
        {
            cwd: projectRoot,
            timeout: 10000,
            maxBuffer: 2 * 1024 * 1024
        },
        (error, stdout, stderr) => {
            if (error) {
                console.error("Memory analysis failed:", stderr || error.message);
                return res.status(500).json({
                    error: "Failed to run memory analysis."
                });
            }

            try {
                return res.json(JSON.parse(stdout));
            } catch (parseError) {
                console.error("Invalid memory analysis JSON:", parseError.message);
                return res.status(500).json({
                    error: "Memory analysis returned invalid JSON."
                });
            }
        }
    );
});


app.get("/api/analysis/memory/live", (req, res) => {
    const projectRoot = path.resolve(__dirname, "..");
    const pythonPath = path.join(
        projectRoot,
        ".venv",
        "bin",
        "python"
    );

    execFile(
        pythonPath,
        ["-m", "analysis.os.live_memory_analysis", "--json"],
        {
            cwd: projectRoot,
            timeout: 10000,
            maxBuffer: 2 * 1024 * 1024
        },
        (error, stdout, stderr) => {
            if (error) {
                console.error(
                    "Live memory analysis failed:",
                    stderr || error.message
                );

                return res.status(500).json({
                    error: "Failed to collect live memory metrics."
                });
            }

            try {
                return res.json(JSON.parse(stdout));
            } catch (parseError) {
                console.error(
                    "Invalid live memory JSON:",
                    parseError.message
                );

                return res.status(500).json({
                    error: "Live memory analysis returned invalid JSON."
                });
            }
        }
    );
});


app.get("/api/analysis/memory/process-history", (req, res) => {
    const limit = Math.min(
        Math.max(Number.parseInt(req.query.limit, 10) || 100, 1),
        500
    );

    const query = `
        SELECT
            timestamp,
            pid,
            process_name,
            memory_usage,
            cpu_usage,
            system_metric_id
        FROM process_metrics
        ORDER BY timestamp DESC, id DESC
        LIMIT ?
    `;

    db.query(query, [limit], (err, results) => {
        if (err) {
            console.error(
                "Historical process memory query failed:",
                err
            );

            return res.status(500).json({
                error: "Failed to fetch historical process memory."
            });
        }

        const history = results.reverse().map((row) => ({
            timestamp: row.timestamp,
            pid: row.pid,
            name: row.process_name,
            memory_percent: Number(row.memory_usage),
            cpu_percent: Number(row.cpu_usage),
            snapshot_id: row.system_metric_id
        }));

        return res.json({
            count: history.length,
            history
        });
    });
});


app.listen(PORT, ()=>{
    console.log(`Backend is listening to port ${PORT}`)
});