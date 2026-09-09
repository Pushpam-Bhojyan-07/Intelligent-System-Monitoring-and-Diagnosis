const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
require("dotenv").config({ path: "../.env" });

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

app.listen(PORT, ()=>{
    console.log(`Backend is listening to port ${PORT}`)
});