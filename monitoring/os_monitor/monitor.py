from database.db_connection import save_system_metrics, save_process_metrics
import psutil
import time


def get_cpu_usage():
    """Return current overall CPU utilization percentage."""
    return psutil.cpu_percent(interval=1)


def get_memory_usage():
    """Return the percentage of physical RAM currently used."""
    return psutil.virtual_memory().percent


def get_detailed_memory_usage():
    """
    Return detailed physical RAM information.

    All memory sizes are in bytes.
    """
    memory = psutil.virtual_memory()

    return {
        "total_bytes": memory.total,
        "used_bytes": memory.used,
        "available_bytes": memory.available,
        "free_bytes": memory.free,
        "percent": memory.percent,
    }


def get_swap_usage():
    """
    Return swap memory statistics.

    Swap may be unavailable or disabled on some systems.
    All memory sizes are in bytes.
    """
    swap = psutil.swap_memory()

    return {
        "total_bytes": swap.total,
        "used_bytes": swap.used,
        "free_bytes": swap.free,
        "percent": swap.percent,
    }


def get_disk_usage():
    """Return disk usage percentage for the root filesystem."""
    return psutil.disk_usage("/").percent


def get_network_usage():
    """
    Return cumulative network byte counters.

    These values represent totals since boot, not transfer
    rates for the current monitoring interval.
    """
    network = psutil.net_io_counters()

    return {
        "bytes_sent": network.bytes_sent,
        "bytes_received": network.bytes_recv,
    }



def get_process_data():
    processes = []

    for process in psutil.process_iter(
        ["pid", "name", "memory_percent", "create_time"]
    ):
        try:
            process.cpu_percent(None)

            processes.append(process)

        except (
            psutil.NoSuchProcess,
            psutil.AccessDenied,
            psutil.ZombieProcess,
        ):
            continue

    time.sleep(1)

    process_data = []
    for process in processes:
        try:
            with process.oneshot():
                pid = process.pid
                name = process.name()
                cpu = process.cpu_percent(None)
                memory_percent = process.memory_percent()
                memory_info = process.memory_info()
                create_time = process.create_time()

            process_data.append({
                "pid": pid,
                "name": name,
                "cpu_percent": round(cpu, 2),
                "memory_percent": round(memory_percent, 2),
                "memory_bytes": memory_info.rss,
                "create_time": create_time,
            })

        except (
            psutil.NoSuchProcess,
            psutil.AccessDenied,
            psutil.ZombieProcess,
        ):
            continue

    return process_data

def get_top_cpu_processes(processes, limit=5):
    """Return processes with the highest CPU usage."""
    return sorted(
        processes,
        key=lambda process: process["cpu_percent"],
        reverse=True,
    )[:limit]


def get_top_memory_processes(processes, limit=10):
    """Return processes with the highest RAM usage."""
    return sorted(
        processes,
        key=lambda process: process["memory_bytes"],
        reverse=True,
    )[:limit]


def collect_system_metrics():
    """Collect a complete live system metrics snapshot."""

    cpu = get_cpu_usage()
    memory = get_detailed_memory_usage()
    swap = get_swap_usage()
    disk = get_disk_usage()
    network = get_network_usage()

    processes = get_process_data()

    top_cpu = get_top_cpu_processes(processes, limit=5)
    top_memory = get_top_memory_processes(processes, limit=10)

    return {
        "cpu": cpu,
        "memory": memory["percent"],
        "memory_details": memory,
        "swap": swap,
        "disk": disk,
        "network": network,
        "processes": processes,
        "top_cpu_processes": top_cpu,
        "top_memory_processes": top_memory,
    }



def create_snapshot():
    """Build a snapshot containing system and process metrics."""

    metrics = collect_system_metrics()

    snapshot = {
        "cpu": metrics["cpu"],
        "memory": metrics["memory"],
        "disk": metrics["disk"],

        "bytes_sent": metrics["network"]["bytes_sent"],
        "bytes_received": metrics["network"]["bytes_received"],

        "memory_details": metrics["memory_details"],
        "swap": metrics["swap"],

        "top_cpu_processes": metrics["top_cpu_processes"],
        "top_memory_processes": metrics["top_memory_processes"],
    }

    return snapshot



def display_snapshot(snapshot):
    """Print a readable system monitoring report."""

    memory = snapshot["memory_details"]
    swap = snapshot["swap"]

    print("\n" + "=" * 55)
    print("                 SYSGUARD MONITOR")
    print("=" * 55)

    print("\nSYSTEM METRICS")
    print("-" * 55)

    print(f"CPU Usage       : {snapshot['cpu']:.2f}%")
    print(f"RAM Usage       : {memory['percent']:.2f}%")
    print(f"RAM Total       : {memory['total_bytes'] / (1024 ** 3):.2f} GB")
    print(f"RAM Used        : {memory['used_bytes'] / (1024 ** 3):.2f} GB")
    print(f"RAM Available   : {memory['available_bytes'] / (1024 ** 3):.2f} GB")

    print(f"Swap Usage      : {swap['percent']:.2f}%")
    print(f"Swap Total      : {swap['total_bytes'] / (1024 ** 3):.2f} GB")
    print(f"Swap Used       : {swap['used_bytes'] / (1024 ** 3):.2f} GB")

    print(f"Disk Usage      : {snapshot['disk']:.2f}%")
    print(f"Bytes Sent      : {snapshot['bytes_sent']}")
    print(f"Bytes Received  : {snapshot['bytes_received']}")

    print("\nTOP 5 CPU PROCESSES")
    print("-" * 55)

    for process in snapshot["top_cpu_processes"]:
        print(
            f"PID: {process['pid']:<7} "
            f"{process['name'][:22]:<22} "
            f"CPU: {process['cpu_percent']:>6.2f}%"
        )

    print("\nTOP 10 MEMORY PROCESSES")
    print("-" * 55)

    for process in snapshot["top_memory_processes"]:
        print(
            f"PID: {process['pid']:<7} "
            f"{process['name'][:22]:<22} "
            f"RAM: {process['memory_percent']:>6.2f}% "
            f"({process['memory_bytes'] / (1024 ** 2):.2f} MB)"
        )


def main():
    """Continuously collect and save system metrics."""

    try:
        while True:
            snapshot = create_snapshot()

            display_snapshot(snapshot)
        
            snapshot_id = save_system_metrics(snapshot)
            processes_by_pid = {}

            for process in (
                snapshot["top_cpu_processes"]
                + snapshot["top_memory_processes"]
            ):
                processes_by_pid[process["pid"]] = process

            processes_to_save = list(processes_by_pid.values())

            save_process_metrics(snapshot_id, processes_to_save)

            print(f"\nSystem metrics saved! Snapshot ID: {snapshot_id}")
            print(f"Process metrics saved: {len(processes_to_save)} processes")
        

            print("\nDATABASE STATUS")
            print("-" * 55)
            print(f"System metrics saved! Snapshot ID: {snapshot_id}")
            print("CPU-ranked process metrics saved.")
            print("Next collection in 5 seconds...")

            time.sleep(5)

    except KeyboardInterrupt:
        print("\nSysGuard monitoring stopped by user.")

    except Exception as error:
        print(f"\nMonitoring error: {error}")
        raise


if __name__ == "__main__":
    main()
