CPU_THRESHOLD = 80
MEMORY_THRESHOLD = 85
QUERY_LATENCY_THRESHOLD = 5

from analysis.correlation.os_dbms_correlation import build_correlation_dataset
import json
import argparse

def diagnose_interval(record):

    issues = []

    cpu = record["avg_cpu"]
    memory = record["avg_memory"]
    latency = record["avg_latency"]

    # Check CPU usage.
    if cpu >= CPU_THRESHOLD:
        issues.append({
            "issue": "High CPU Usage",
            "message": f"Average CPU usage is {cpu:.2f}%.",
            "severity": "High",
            "recommendation": (
                "Identify CPU-intensive processes and optimize "
                "their resource usage."
            )
        })

    # Check memory usage.
    if memory >= MEMORY_THRESHOLD:
        issues.append({
            "issue": "High Memory Usage",
            "message": f"Average memory usage is {memory:.2f}%.",
            "severity": "High",
            "recommendation": (
                "Identify memory-intensive processes and investigate "
                "unnecessary memory consumption."
            )
        })

    # Check query latency.
    if latency >= QUERY_LATENCY_THRESHOLD:
        issues.append({
            "issue": "High Query Latency",
            "message": f"Average query latency is {latency:.2f} ms.",
            "severity": "High",
            "recommendation": (
                "Examine slow queries, indexes, and query execution plans."
            )
        })

    # Check possible CPU-related database slowdown.
    if cpu >= CPU_THRESHOLD and latency >= QUERY_LATENCY_THRESHOLD:
        issues.append({
            "issue": "Possible CPU-Related DBMS Slowdown",
            "message": (
                "High CPU usage and high query latency occurred "
                "in the same interval."
            ),
            "severity": "Critical",
            "recommendation": (
                "Investigate CPU-intensive processes running "
                "during the high-latency interval."
            )
        })

    # Check possible memory-related database slowdown.
    if memory >= MEMORY_THRESHOLD and latency >= QUERY_LATENCY_THRESHOLD:
        issues.append({
            "issue": "Possible Memory-Related DBMS Slowdown",
            "message": (
                "High memory usage and high query latency occurred "
                "in the same interval."
            ),
            "severity": "Critical",
            "recommendation": (
                "Investigate memory pressure and possible swapping "
                "during the high-latency interval."
            )
        })

    return issues


def diagnose_all_intervals(dataset):

    diagnosis_results = []

    for record in dataset:
        issues = diagnose_interval(record)

        if issues:
            diagnosis_results.append({
                "interval_start": record["interval_start"],
                "interval_end": record["interval_end"],
                "issues": issues
            })

    return diagnosis_results


def display_metric_summary(dataset):

    if not dataset:
        print("No matched data available.")
        return

    print("\n========== METRIC SUMMARY ==========")

    print(
        "Maximum CPU Usage:",
        max(record["avg_cpu"] for record in dataset), "%"
    )

    print(
        "Maximum Memory Usage:",
        max(record["avg_memory"] for record in dataset), "%"
    )

    print(
        "Maximum Query Latency:",
        max(record["avg_latency"] for record in dataset), "ms"
    )

    print(
        "Maximum Query Executions:",
        max(record["total_executions"] for record in dataset)
    )


def test_diagnosis():

    test_record = {
        "avg_cpu": 90,
        "avg_memory": 90,
        "avg_latency": 8.5
    }

    print("\n========== DIAGNOSIS TEST ==========")

    results = diagnose_interval(test_record)

    for issue in results:
        print(f"Issue: {issue['issue']}")
        print(f"Message: {issue['message']}")
        print(f"Severity: {issue['severity']}")
        print(f"Recommendation: {issue['recommendation']}")
        print("--------------------------------")


def detect_sustained_metric(
    dataset,
    metric_name,
    threshold,
    issue_name,
    consecutive_intervals=3
):

    sustained_issues = []
    count = 0
    previous_end = None

    dataset = sorted(
        dataset,
        key=lambda record: record["interval_start"]
    )

    for record in dataset:

        current_start = record["interval_start"]
        current_end = record["interval_end"]

        # Reset counter if there is a gap between intervals.
        if previous_end is not None and current_start > previous_end:
            count = 0

        if record[metric_name] >= threshold:
            count += 1
        else:
            count = 0

        if count == consecutive_intervals:
            sustained_issues.append({
                "interval_start": current_start,
                "interval_end": current_end,
                "issue": issue_name,
                "message": (
                    f"{metric_name} remained at or above {threshold} "
                    f"for {consecutive_intervals} consecutive intervals."
                ),
                "severity": "Critical",
                "recommendation": (
                    "Investigate the underlying resource usage "
                    "and take corrective action."
                )
            })

        previous_end = current_end

    return sustained_issues


def generate_diagnosis_report(dataset):

    # Detect sustained performance issues.
    cpu_alerts = detect_sustained_metric(
        dataset,
        "avg_cpu",
        CPU_THRESHOLD,
        "Sustained High CPU Usage"
    )

    memory_alerts = detect_sustained_metric(
        dataset,
        "avg_memory",
        MEMORY_THRESHOLD,
        "Sustained High Memory Usage"
    )

    latency_alerts = detect_sustained_metric(
        dataset,
        "avg_latency",
        QUERY_LATENCY_THRESHOLD,
        "Sustained High Query Latency"
    )

    all_sustained_alerts = (
        cpu_alerts + memory_alerts + latency_alerts
    )

    # Diagnose individual intervals.
    diagnosis_results = diagnose_all_intervals(dataset)

    # Prepare metric summary.
    if dataset:
        metric_summary = {
            "max_cpu": max(
                record["avg_cpu"] for record in dataset
            ),
            "max_memory": max(
                record["avg_memory"] for record in dataset
            ),
            "max_query_latency": max(
                record["avg_latency"] for record in dataset
            ),
            "max_query_executions": max(
                record["total_executions"] for record in dataset
            )
        }
    else:
        metric_summary = {
            "max_cpu": 0,
            "max_memory": 0,
            "max_query_latency": 0,
            "max_query_executions": 0
        }

    return {
        "total_matched_intervals": len(dataset),
        "intervals_with_detected_issues": len(diagnosis_results),
        "diagnoses": diagnosis_results,
        "sustained_alerts": all_sustained_alerts,
        "metric_summary": metric_summary
    }


if __name__ == "__main__":

    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    dataset = build_correlation_dataset()

    report = generate_diagnosis_report(dataset)

    if args.json:

        print(json.dumps(report, default=str))

    else:

        test_diagnosis()

        print("\n========== SUSTAINED PERFORMANCE ALERTS ==========")

        if not report["sustained_alerts"]:
            print("No sustained performance issues detected.")
        else:
            for alert in report["sustained_alerts"]:
                print(alert)

        display_metric_summary(dataset)

        print("\n========== SYSGUARD OS-DBMS DIAGNOSIS ==========")

        print(
            "Total matched intervals:",
            report["total_matched_intervals"]
        )

        print(
            "Intervals with detected issues:",
            report["intervals_with_detected_issues"]
        )

        for result in report["diagnoses"]:

            print(f"\nInterval Start: {result['interval_start']}")
            print(f"Interval End: {result['interval_end']}")

            for issue in result["issues"]:
                print(f"Issue: {issue['issue']}")
                print(f"Message: {issue['message']}")
                print(f"Severity: {issue['severity']}")
                print(f"Recommendation: {issue['recommendation']}")
                print("--------------------------------")