
def fcfs_scheduling(processes):
    """
    Each process is a dictionary:
    {"pid": "P1", "arrival_time": 0, "burst_time": 4}
    """
    # Process earlier arrivals first
    processes = sorted(
        processes,
        key=lambda process: process["arrival_time"]
    )

    current_time = 0
    results = []
    gantt_chart = []

    for process in processes:
        pid = process["pid"]
        arrival = process["arrival_time"]
        burst = process["burst_time"]

        # CPU remains idle if the next process hasn't arrived
        if current_time < arrival:
            gantt_chart.append({
                "process": "Idle",
                "start": current_time,
                "end": arrival
            })
            current_time = arrival

        start_time = current_time
        completion_time = start_time + burst

        turnaround_time = completion_time - arrival
        waiting_time = turnaround_time - burst
        response_time = start_time - arrival

        results.append({
            "pid": pid,
            "arrival_time": arrival,
            "burst_time": burst,
            "start_time": start_time,
            "completion_time": completion_time,
            "turnaround_time": turnaround_time,
            "waiting_time": waiting_time,
            "response_time": response_time
        })

        gantt_chart.append({
            "process": pid,
            "start": start_time,
            "end": completion_time
        })

        current_time = completion_time

    count = len(results)

    averages = {
        "average_waiting_time": (
            sum(p["waiting_time"] for p in results) / count
            if count else 0
        ),
        "average_turnaround_time": (
            sum(p["turnaround_time"] for p in results) / count
            if count else 0
        ),
        "average_response_time": (
            sum(p["response_time"] for p in results) / count
            if count else 0
        )
    }

    return {
        "processes": results,
        "gantt_chart": gantt_chart,
        "averages": averages
    }



def sjf_scheduling(processes):
    """Non-preemptive Shortest Job First scheduling."""

    remaining = [process.copy() for process in processes]
    current_time = 0
    results = []
    gantt_chart = []

    while remaining:
        available = [
            process for process in remaining
            if process["arrival_time"] <= current_time
        ]

        if not available:
            next_arrival = min(
                process["arrival_time"] for process in remaining
            )

            gantt_chart.append({
                "process": "Idle",
                "start": current_time,
                "end": next_arrival
            })
            current_time = next_arrival
            continue

        # Choose the shortest available job.
        process = min(
            available,
            key=lambda p: (p["burst_time"], p["arrival_time"], p["pid"])
        )
        remaining.remove(process)

        pid = process["pid"]
        arrival = process["arrival_time"]
        burst = process["burst_time"]

        start_time = current_time
        completion_time = start_time + burst
        turnaround_time = completion_time - arrival
        waiting_time = turnaround_time - burst
        response_time = start_time - arrival

        results.append({
            "pid": pid,
            "arrival_time": arrival,
            "burst_time": burst,
            "start_time": start_time,
            "completion_time": completion_time,
            "turnaround_time": turnaround_time,
            "waiting_time": waiting_time,
            "response_time": response_time
        })

        gantt_chart.append({
            "process": pid,
            "start": start_time,
            "end": completion_time
        })

        current_time = completion_time

    count = len(results)

    averages = {
        "average_waiting_time": (
            sum(p["waiting_time"] for p in results) / count
            if count else 0
        ),
        "average_turnaround_time": (
            sum(p["turnaround_time"] for p in results) / count
            if count else 0
        ),
        "average_response_time": (
            sum(p["response_time"] for p in results) / count
            if count else 0
        )
    }

    return {
        "processes": results,
        "gantt_chart": gantt_chart,
        "averages": averages
    }


def priority_scheduling(processes):
    """Non-preemptive Priority Scheduling; lower number = higher priority."""

    remaining = [process.copy() for process in processes]
    current_time = 0
    results = []
    gantt_chart = []

    while remaining:
        available = [
            p for p in remaining
            if p["arrival_time"] <= current_time
        ]

        if not available:
            next_arrival = min(p["arrival_time"] for p in remaining)
            gantt_chart.append({
                "process": "Idle",
                "start": current_time,
                "end": next_arrival
            })
            current_time = next_arrival
            continue

        process = min(
            available,
            key=lambda p: (
                p["priority"],
                p["arrival_time"],
                p["pid"]
            )
        )
        remaining.remove(process)

        pid = process["pid"]
        arrival = process["arrival_time"]
        burst = process["burst_time"]

        start_time = current_time
        completion_time = start_time + burst
        turnaround_time = completion_time - arrival
        waiting_time = turnaround_time - burst
        response_time = start_time - arrival

        results.append({
            "pid": pid,
            "arrival_time": arrival,
            "burst_time": burst,
            "priority": process["priority"],
            "start_time": start_time,
            "completion_time": completion_time,
            "turnaround_time": turnaround_time,
            "waiting_time": waiting_time,
            "response_time": response_time
        })

        gantt_chart.append({
            "process": pid,
            "start": start_time,
            "end": completion_time
        })

        current_time = completion_time

    count = len(results)
    averages = {
        "average_waiting_time": (
            sum(p["waiting_time"] for p in results) / count if count else 0
        ),
        "average_turnaround_time": (
            sum(p["turnaround_time"] for p in results) / count if count else 0
        ),
        "average_response_time": (
            sum(p["response_time"] for p in results) / count if count else 0
        )
    }

    return {
        "processes": results,
        "gantt_chart": gantt_chart,
        "averages": averages
    }



from collections import deque


def round_robin_scheduling(processes, time_quantum):
    """Round Robin CPU scheduling with arrival times."""

    if time_quantum <= 0:
        raise ValueError("Time quantum must be positive.")

    remaining = [p.copy() for p in processes]

    if any(p["arrival_time"] < 0 or p["burst_time"] <= 0 for p in remaining):
        raise ValueError("Arrival times must be non-negative and burst times positive.")

    remaining.sort(key=lambda p: (p["arrival_time"], p["pid"]))

    remaining_burst = {p["pid"]: p["burst_time"] for p in remaining}
    first_start = {}
    completion = {}
    current_time = 0
    next_process = 0
    ready_queue = deque()
    gantt_chart = []

    while next_process < len(remaining) or ready_queue:
        if not ready_queue and next_process < len(remaining):
            next_arrival = remaining[next_process]["arrival_time"]

            if current_time < next_arrival:
                gantt_chart.append({
                    "process": "Idle",
                    "start": current_time,
                    "end": next_arrival
                })
                current_time = next_arrival

            while (
                next_process < len(remaining)
                and remaining[next_process]["arrival_time"] <= current_time
            ):
                ready_queue.append(remaining[next_process]["pid"])
                next_process += 1

        pid = ready_queue.popleft()
        start_time = current_time

        if pid not in first_start:
            first_start[pid] = start_time

        run_time = min(time_quantum, remaining_burst[pid])
        current_time += run_time
        remaining_burst[pid] -= run_time

        gantt_chart.append({
            "process": pid,
            "start": start_time,
            "end": current_time
        })

        # Processes that arrived during this time slice join the queue first.
        while (
            next_process < len(remaining)
            and remaining[next_process]["arrival_time"] <= current_time
        ):
            ready_queue.append(remaining[next_process]["pid"])
            next_process += 1

        if remaining_burst[pid] > 0:
            ready_queue.append(pid)
        else:
            completion[pid] = current_time

    results = []

    for process in remaining:
        pid = process["pid"]
        arrival = process["arrival_time"]
        burst = process["burst_time"]
        completion_time = completion[pid]
        turnaround_time = completion_time - arrival

        results.append({
            "pid": pid,
            "arrival_time": arrival,
            "burst_time": burst,
            "start_time": first_start[pid],
            "completion_time": completion_time,
            "turnaround_time": turnaround_time,
            "waiting_time": turnaround_time - burst,
            "response_time": first_start[pid] - arrival
        })

    count = len(results)
    averages = {
        "average_waiting_time": (
            sum(p["waiting_time"] for p in results) / count if count else 0
        ),
        "average_turnaround_time": (
            sum(p["turnaround_time"] for p in results) / count if count else 0
        ),
        "average_response_time": (
            sum(p["response_time"] for p in results) / count if count else 0
        )
    }

    return {
        "processes": results,
        "gantt_chart": gantt_chart,
        "averages": averages
    }

