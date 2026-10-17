
import time
from datetime import datetime

import psutil


def collect_process_activity(interval=1.0):
    """Continuously track process first-seen time and CPU activity."""

    process_history = {}
    monitoring_start = time.monotonic()

    print("SysGuard: Process activity monitoring started")
    print("Press Ctrl+C to stop.\n")

    try:
        while True:
            sample_time = datetime.now().astimezone().isoformat()
            elapsed_time = round(
                time.monotonic() - monitoring_start, 2
            )

            # Discover processes currently visible to psutil.
            for proc in psutil.process_iter(
                ["pid", "name", "create_time"]
            ):
                try:
                    info = proc.info
                    pid = info["pid"]
                    create_time = info["create_time"]

                    # create_time helps distinguish reused PIDs.
                    key = (pid, create_time)

                    if key not in process_history:
                        process_history[key] = {
                            "pid": pid,
                            "name": info["name"] or "Unknown",
                            "first_seen_at": sample_time,
                            "arrival_time_seconds": elapsed_time,
                            "create_time": create_time,
                            "process": proc,
                            "samples": [],
                            "status": "running",
                            "first_cpu_sample": True,
                        }

                except (
                    psutil.NoSuchProcess,
                    psutil.AccessDenied,
                    psutil.ZombieProcess,
                ):
                    continue

            # Sample each process using its persistent Process object.
            for record in process_history.values():
                if record["status"] != "running":
                    continue

                proc = record["process"]

                try:
                    cpu = proc.cpu_percent(interval=None)
                    memory = proc.memory_percent()

                    first_sample = record["first_cpu_sample"]
                    record["first_cpu_sample"] = False

                    record["samples"].append({
                        "timestamp": sample_time,
                        "elapsed_seconds": elapsed_time,
                        "cpu_percent": round(cpu, 2),
                        "memory_percent": round(memory, 2),
                        "cpu_sample_valid": not first_sample,
                        "cpu_active": (
                            not first_sample and cpu > 0
                        ),
                    })

                except (
                    psutil.NoSuchProcess,
                    psutil.AccessDenied,
                    psutil.ZombieProcess,
                ):
                    record["status"] = "terminated"
                    record["ended_at"] = sample_time

            print(
                f"\nElapsed: {elapsed_time}s | "
                f"Processes tracked: {len(process_history)}"
            )

            for record in list(process_history.values())[-5:]:
                samples = record["samples"]
                if not samples:
                    continue

                latest = samples[-1]

                print(
                    f"PID: {record['pid']} | "
                    f"{record['name'][:24]:24} | "
                    f"CPU: {latest['cpu_percent']:6.2f}% | "
                    f"Active: {latest['cpu_active']} | "
                    f"First seen: "
                    f"{record['arrival_time_seconds']}s"
                )

            time.sleep(interval)

    except KeyboardInterrupt:
        print("\nMonitoring stopped.")

    return process_history



def print_activity_summary(process_history):
    print("\n" + "=" * 90)
    print("SYSGUARD — PROCESS ACTIVITY SUMMARY")
    print("=" * 90)

    header = (
        f"{'PID':<8}"
        f"{'Process':<24}"
        f"{'First Seen(s)':<15}"
        f"{'Samples':<10}"
        f"{'Active':<9}"
        f"{'Activity %':<12}"
        f"{'Avg CPU %':<10}"
    )
    print(header)
    print("-" * 90)

    for record in process_history.values():
        valid_samples = [
            sample
            for sample in record["samples"]
            if sample["cpu_sample_valid"]
        ]

        if not valid_samples:
            continue

        active_count = sum(
            1 for sample in valid_samples
            if sample["cpu_active"]
        )

        activity_ratio = (
            active_count / len(valid_samples)
        ) * 100

        average_cpu = sum(
            sample["cpu_percent"]
            for sample in valid_samples
        ) / len(valid_samples)

        print(
            f"{record['pid']:<8}"
            f"{record['name'][:23]:<24}"
            f"{record['arrival_time_seconds']:<15.2f}"
            f"{len(valid_samples):<10}"
            f"{active_count:<9}"
            f"{activity_ratio:<12.2f}"
            f"{average_cpu:<10.2f}"
        )



def print_top_active_processes(process_history, limit=10):
    summaries = []

    for record in process_history.values():
        valid_samples = [
            sample for sample in record["samples"]
            if sample["cpu_sample_valid"]
        ]

        # Avoid ranking processes with too little data.
        if len(valid_samples) < 3:
            continue

        average_cpu = sum(
            sample["cpu_percent"] for sample in valid_samples
        ) / len(valid_samples)

        active_count = sum(
            sample["cpu_active"] for sample in valid_samples
        )

        activity_ratio = active_count / len(valid_samples) * 100

        summaries.append({
            "pid": record["pid"],
            "name": record["name"],
            "samples": len(valid_samples),
            "average_cpu": average_cpu,
            "activity_ratio": activity_ratio,
        })

    summaries.sort(
        key=lambda item: item["average_cpu"],
        reverse=True
    )

    print("\nTOP CPU-ACTIVE PROCESSES")
    print("-" * 75)
    print(
        f"{'PID':<8}{'Process':<28}"
        f"{'Samples':<10}{'Avg CPU %':<12}{'Activity %':<12}"
    )

    for item in summaries[:limit]:
        print(
            f"{item['pid']:<8}"
            f"{item['name'][:27]:<28}"
            f"{item['samples']:<10}"
            f"{item['average_cpu']:<12.2f}"
            f"{item['activity_ratio']:<12.2f}"
        )


def detect_high_cpu_processes(process_history, threshold=80.0):
    print(f"\nHIGH CPU PROCESS ALERTS (threshold: {threshold}%)")
    print("-" * 70)

    alerts_found = 0

    for record in process_history.values():
        valid_samples = [
            sample for sample in record["samples"]
            if sample["cpu_sample_valid"]
        ]

        # Require enough samples to reduce misleading alerts.
        if len(valid_samples) < 5:
            continue

        average_cpu = sum(
            sample["cpu_percent"] for sample in valid_samples
        ) / len(valid_samples)

        if average_cpu >= threshold:
            alerts_found += 1
            print(
                f"PID: {record['pid']} | "
                f"Process: {record['name']} | "
                f"Average CPU: {average_cpu:.2f}% | "
                f"Samples: {len(valid_samples)}"
            )

    if alerts_found == 0:
        print("No processes crossed the configured threshold.")



def detect_sustained_high_cpu(process_history, threshold=80.0, consecutive_samples=5):
    print(f"\nSUSTAINED HIGH CPU ALERTS (>{threshold}%)")
    print("-" * 70)

    alerts_found = 0

    for record in process_history.values():
        valid_samples = [
            sample for sample in record["samples"]
            if sample["cpu_sample_valid"]
        ]

        if len(valid_samples) < consecutive_samples:
            continue

        # Count the longest consecutive run above the threshold.
        current_streak = 0
        longest_streak = 0

        for sample in valid_samples:
            if sample["cpu_percent"] > threshold:
                current_streak += 1
                longest_streak = max(longest_streak, current_streak)
            else:
                current_streak = 0

        if longest_streak >= consecutive_samples:
            alerts_found += 1
            print(
                f"PID: {record['pid']} | "
                f"Process: {record['name']} | "
                f"Longest streak: {longest_streak} samples"
            )

    if alerts_found == 0:
        print("No sustained high-CPU processes detected.")


if __name__ == "__main__":
    history = collect_process_activity()
    print_activity_summary(history)
    print_top_active_processes(history)
    detect_high_cpu_processes(history)
    detect_sustained_high_cpu(history)
