import argparse
import json
from database.db_connection import (
    get_historical_process_metrics,
    get_all_historical_process_metrics,
)


def analyze_process_history(pid, threshold=80.0, limit=100):
    records = get_historical_process_metrics(pid, limit)

    if not records:
        print(f"No historical records found for PID {pid}.")
        return None

    cpu_values = [float(record["cpu_usage"]) for record in records]
    memory_values = [float(record["memory_usage"]) for record in records]

    total_samples = len(cpu_values)
    high_cpu_samples = sum(cpu >= threshold for cpu in cpu_values)

    avg_cpu = sum(cpu_values) / total_samples
    avg_memory = sum(memory_values) / total_samples

    high_cpu_percentage = (high_cpu_samples / total_samples) * 100

    result = {
        "pid": pid,
        "process_name": records[0]["process_name"],
        "total_samples": total_samples,
        "avg_cpu": round(avg_cpu, 2),
        "avg_memory": round(avg_memory, 2),
        "high_cpu_samples": high_cpu_samples,
        "high_cpu_percentage": round(high_cpu_percentage, 2),
        "threshold": threshold,
    }

    print("\nHISTORICAL PROCESS ANALYSIS")
    print("-" * 45)
    print(f"PID                 : {result['pid']}")
    print(f"Process             : {result['process_name']}")
    print(f"Total samples       : {result['total_samples']}")
    print(f"Average CPU         : {result['avg_cpu']}%")
    print(f"Average memory      : {result['avg_memory']}%")
    print(f"High CPU samples    : {result['high_cpu_samples']}")
    print(f"High CPU percentage : {result['high_cpu_percentage']}%")

    if result["high_cpu_percentage"] == 100:
        print("Status              : HIGH CPU IN ALL RECORDED SAMPLES")
    elif result["high_cpu_percentage"] > 0:
        print("Status              : HIGH CPU IN SOME RECORDED SAMPLES")
    else:
        print("Status              : NO HIGH CPU SAMPLES")

    return result




def analyze_all_processes(
    threshold=80.0,
    limit=500,
    min_samples=3
):
    records = get_all_historical_process_metrics(limit)

    if not records:
        print("No historical process records found.")
        return []

    grouped = {}

    for record in records:
        key = (record["pid"], record["process_name"])

        if key not in grouped:
            grouped[key] = {
                "cpu_values": [],
                "memory_values": [],
            }

        grouped[key]["cpu_values"].append(
            float(record["cpu_usage"])
        )
        grouped[key]["memory_values"].append(
            float(record["memory_usage"])
        )

    results = []

    for (pid, name), values in grouped.items():
        cpu_values = values["cpu_values"]
        memory_values = values["memory_values"]

        total_samples = len(cpu_values)

        if total_samples < min_samples:
            continue

        high_samples = sum(
            cpu >= threshold for cpu in cpu_values
        )

        result = {
            "pid": pid,
            "process_name": name,
            "total_samples": total_samples,
            "avg_cpu": round(
                sum(cpu_values) / total_samples, 2
            ),
            "avg_memory": round(
                sum(memory_values) / total_samples, 2
            ),
            "high_cpu_samples": high_samples,
            "high_cpu_percentage": round(
                high_samples / total_samples * 100, 2
            ),
        }

        results.append(result)

    results.sort(
        key=lambda item: item["avg_cpu"],
        reverse=True
    )

    print("\nALL-PROCESS HISTORICAL ANALYSIS")
    print("=" * 95)
    print(
        f"{'PID':<8} {'Process':<32} {'Samples':>8} "
        f"{'Avg CPU %':>11} {'Avg RAM %':>11} {'High CPU %':>12}"
    )
    print("-" * 95)

    for item in results:
        print(
            f"{item['pid']:<8} "
            f"{item['process_name'][:30]:<32} "
            f"{item['total_samples']:>8} "
            f"{item['avg_cpu']:>11.2f} "
            f"{item['avg_memory']:>11.2f} "
            f"{item['high_cpu_percentage']:>11.2f}%"
        )

    print("\nHIGH-CPU CANDIDATES")
    
    
    candidates = [
        item for item in results
        if item["total_samples"] >= 5
        and (
            item["avg_cpu"] >= threshold
            or item["high_cpu_percentage"] >= 80.0
        )
    ]

    print("\nHIGH-CPU CANDIDATES")

    if not candidates:
        print("No processes exceeded the threshold.")
    else:
        for item in candidates:
            print(
                f"PID {item['pid']} | {item['process_name']} | "
                f"Average CPU: {item['avg_cpu']}% | "
                f"High samples: {item['high_cpu_percentage']}%"
            )

    print("\nANALYSIS SUMMARY")
    print("-" * 35)
    print(f"Records retrieved : {len(records)}")
    print(f"Processes analyzed: {len(results)}")
    print(f"High-CPU candidates: {len(candidates)}")

    return {
        "records_retrieved": len(records),
        "processes_analyzed": len(results),
        "high_cpu_candidates": candidates,
        "processes": results,
    }




if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.json:
        # Keep the API response clean: suppress the human-readable report.
        import contextlib
        import io

        with contextlib.redirect_stdout(io.StringIO()):
            analysis = analyze_all_processes(
                threshold=80.0,
                limit=500,
                min_samples=3
            )

        print(json.dumps(analysis))
    else:
        analyze_all_processes(
            threshold=80.0,
            limit=500,
            min_samples=3
        )

