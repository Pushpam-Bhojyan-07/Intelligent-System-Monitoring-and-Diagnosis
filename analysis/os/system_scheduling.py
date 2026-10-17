
from monitoring.os_monitor.monitor import get_process_data
from analysis.os.cpu_scheduling import (
    fcfs_scheduling,
    sjf_scheduling,
    priority_scheduling,
    round_robin_scheduling
)


def get_live_scheduling_processes(limit=5):
    """Collect live processes and prepare estimated scheduling inputs."""

    observed_processes = get_process_data()

    top_processes = sorted(
        observed_processes,
        key=lambda process: process["cpu_percent"],
        reverse=True
    )[:limit]

    scheduling_processes = []

    for process in top_processes:
        estimated_burst = max(1, round(process["cpu_percent"]))

        scheduling_processes.append({
            "pid": process["pid"],
            "name": process["name"],
            "arrival_time": 0,
            "burst_time": estimated_burst,
            "observed_cpu_percent": process["cpu_percent"],
            "observed_memory_percent": process["memory_percent"]
        })

    return scheduling_processes


def run_live_scheduling_demo():
    live_processes = get_live_scheduling_processes()

    if not live_processes:
        print("No process data available.")
        return

    # Assign priorities independently of the FCFS order.
    priority_order = sorted(
        enumerate(live_processes),
        key=lambda item: item[1]["observed_cpu_percent"]
    )

    priority_by_index = {
        original_index: rank + 1
        for rank, (original_index, _) in enumerate(priority_order)
    }

    scheduling_inputs = []

    for index, process in enumerate(live_processes):
        scheduling_inputs.append({
            "pid": f"P{index + 1}",
            "arrival_time": process["arrival_time"],
            "burst_time": process["burst_time"],
            "priority": priority_by_index[index]
        })

    print("\nLIVE SYSTEM PROCESSES")
    print("=" * 60)

    for process in live_processes:
        print(
            f"PID: {process['pid']} | "
            f"Name: {process['name']} | "
            f"CPU: {process['observed_cpu_percent']}% | "
            f"RAM: {process['observed_memory_percent']:.2f}% | "
            f"Estimated burst: {process['burst_time']}"
        )

    algorithms = {
        "FCFS": lambda: fcfs_scheduling(scheduling_inputs),
        "SJF": lambda: sjf_scheduling(scheduling_inputs),
        "Priority": lambda: priority_scheduling(scheduling_inputs),
        "Round Robin (quantum=2)": lambda: round_robin_scheduling(
            scheduling_inputs, 2
        )
    }

    for name, run_algorithm in algorithms.items():
        print(f"\n{'=' * 60}")
        print(f"{name} RESULTS")
        print("=" * 60)

        result = run_algorithm()
        print(result["averages"])
        print("Gantt chart:", result["gantt_chart"])


if __name__ == "__main__":
    run_live_scheduling_demo()
