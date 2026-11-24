
from datetime import datetime
import argparse
import contextlib
import io
import json

from monitoring.os_monitor.monitor import get_process_data
from database.db_connection import get_connection
from analysis.os.historical_analysis import analyze_all_processes
from analysis.os.cpu_scheduling import (
    fcfs_scheduling,
    sjf_scheduling,
    priority_scheduling,
    round_robin_scheduling,
)


def get_live_scheduling_processes(limit=5, min_samples=5):
    """Prepare scheduling inputs from live processes and CPU history."""

    live_processes = get_process_data()
    historical = analyze_all_processes(limit=500)

    # Index historical analysis by real PID.
    history_by_pid = {
        item["pid"]: item
        for item in historical["processes"]
        if item["total_samples"] >= min_samples
    }

    # Fetch first_seen for the corresponding PIDs.
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT pid, process_name, MIN(first_seen) AS first_seen
            FROM process_metrics
            WHERE first_seen IS NOT NULL
            GROUP BY pid, process_name
        """)
        arrival_rows = cursor.fetchall()
    finally:
        cursor.close()
        connection.close()

    # Keep the earliest timestamp per PID.
    first_seen_by_pid = {}

    for row in arrival_rows:
        pid = row["pid"]
        timestamp = row["first_seen"]

        if (
            timestamp is not None
            and (
                pid not in first_seen_by_pid
                or timestamp < first_seen_by_pid[pid]
            )
        ):
            first_seen_by_pid[pid] = timestamp

    # Match currently running processes with their historical records.
    matched = []

    for process in live_processes:
        pid = process["pid"]
        history = history_by_pid.get(pid)
        first_seen = first_seen_by_pid.get(pid)

        if not history or not first_seen:
            continue

        matched.append({
            **process,
            "first_seen": first_seen,
            "avg_cpu": history["avg_cpu"],
            "historical_samples": history["total_samples"],
        })

    # Choose the top processes by historical average CPU.
    matched.sort(key=lambda p: p["avg_cpu"], reverse=True)
    matched = matched[:limit]

    if not matched:
        return []

    # Convert historical first-seen timestamps into small,
    # relative arrival offsets for the scheduling simulation.
    earliest = min(p["first_seen"] for p in matched)

    scheduling_processes = []

    for process in matched:
        arrival_seconds = (
            0 if process["first_seen"] == earliest else 1
        )

        # CPU percentage is a proxy, NOT actual CPU burst duration.
        estimated_burst = max(1, round(process["avg_cpu"]))

        scheduling_processes.append({
            "pid": str(process["pid"]),
            "name": process["name"],
            "arrival_time": arrival_seconds,
            "burst_time": estimated_burst,
            "priority": max(
                1, round(100 - process["avg_cpu"])
            ),
            "observed_cpu_percent": process["cpu_percent"],
            "observed_memory_percent": process["memory_percent"],
            "historical_avg_cpu": process["avg_cpu"],
            "historical_samples": process["historical_samples"],
            "first_seen": process["first_seen"].isoformat(),
        })

    return scheduling_processes


def run_live_scheduling_demo(limit=5, time_quantum=2):
    live_processes = get_live_scheduling_processes(limit=limit)

    if not live_processes:
        print(
            "No matching live processes with sufficient historical data."
        )
        return

    # Algorithms receive the real PID, relative arrival, and estimated burst.
    scheduling_inputs = [
        {
            "pid": process["pid"],
            "arrival_time": process["arrival_time"],
            "burst_time": process["burst_time"],
            "priority": process["priority"],
        }
        for process in live_processes
    ]

    print("\nLIVE PROCESSES WITH HISTORICAL ANALYSIS")
    print("=" * 75)

    for process in live_processes:
        print(
            f"PID: {process['pid']} | "
            f"Name: {process['name']} | "
            f"Arrival: {process['arrival_time']} | "
            f"Estimated burst: {process['burst_time']} | "
            f"Historical avg CPU: {process['historical_avg_cpu']:.2f}% | "
            f"Samples: {process['historical_samples']}"
        )

    algorithms = {
        "FCFS": lambda: fcfs_scheduling(scheduling_inputs),
        "SJF": lambda: sjf_scheduling(scheduling_inputs),
        "Priority": lambda: priority_scheduling(scheduling_inputs),
        f"Round Robin (quantum={time_quantum})": lambda:
            round_robin_scheduling(scheduling_inputs, time_quantum),
    }

    for name, run_algorithm in algorithms.items():
        result = run_algorithm()

        print(f"\n{'=' * 75}")
        print(f"{name} RESULTS")
        print("=" * 75)
        print("Averages:", result["averages"])
        print("Gantt chart:", result["gantt_chart"])

        names = {p["pid"]: p["name"] for p in live_processes}

        for process in result["processes"]:
            print({
                **process,
                "name": names.get(process["pid"], "Unknown"),
            })


def get_scheduling_results(limit=5, time_quantum=2):
    """Return real-process scheduling results as JSON-serializable data."""

    live_processes = get_live_scheduling_processes(limit=limit)

    if not live_processes:
        return {
            "processes": [],
            "algorithms": {},
            "message": (
                "No matching live processes with sufficient historical data."
            ),
            "time_quantum": time_quantum,
            "burst_time_note": (
                "Burst times are estimated from historical average CPU usage."
            ),
        }

    scheduling_inputs = [
        {
            "pid": process["pid"],
            "arrival_time": process["arrival_time"],
            "burst_time": process["burst_time"],
            "priority": process["priority"],
        }
        for process in live_processes
    ]

    algorithms = {
        "FCFS": fcfs_scheduling(scheduling_inputs),
        "SJF": sjf_scheduling(scheduling_inputs),
        "Priority": priority_scheduling(scheduling_inputs),
        "Round Robin": round_robin_scheduling(
            scheduling_inputs, time_quantum
        ),
    }

    names = {
        process["pid"]: process["name"]
        for process in live_processes
    }

    # Attach real process details to each algorithm's output.
    for result in algorithms.values():
        for process in result["processes"]:
            process["name"] = names.get(process["pid"], "Unknown")

        for segment in result["gantt_chart"]:
            if segment["process"] != "Idle":
                segment["name"] = names.get(
                    segment["process"], "Unknown"
                )

    return {
        "processes": live_processes,
        "algorithms": algorithms,
        "time_quantum": time_quantum,
        "burst_time_note": (
            "Burst times are estimates derived from historical average CPU "
            "usage, not actual OS CPU burst durations."
        ),
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.json:
        # Suppress the historical-analysis report so stdout contains
        # only JSON for the Express API.
        with contextlib.redirect_stdout(io.StringIO()):
            results = get_scheduling_results()

        print(json.dumps(results))
    else:
        run_live_scheduling_demo()
