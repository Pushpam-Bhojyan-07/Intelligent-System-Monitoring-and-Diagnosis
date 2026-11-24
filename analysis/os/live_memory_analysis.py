
import json
import psutil
import sys
from datetime import datetime, timezone


def get_memory_data():
    """Collect live physical RAM statistics."""
    memory = psutil.virtual_memory()

    return {
        "total_bytes": memory.total,
        "used_bytes": memory.used,
        "available_bytes": memory.available,
        "free_bytes": memory.free,
        "percent": memory.percent,
    }


def get_swap_data():
    """Collect live swap memory statistics."""
    swap = psutil.swap_memory()

    return {
        "total_bytes": swap.total,
        "used_bytes": swap.used,
        "free_bytes": swap.free,
        "percent": swap.percent,
    }


def get_top_memory_processes(limit=10):
    """Return running processes sorted by resident RAM usage."""
    processes = []

    for process in psutil.process_iter(
        ["pid", "name", "memory_percent", "memory_info"]
    ):
        try:
            info = process.info
            memory_info = info.get("memory_info")

            if memory_info is None:
                continue

            processes.append({
                "pid": info["pid"],
                "name": info.get("name") or "Unknown",
                "memory_bytes": memory_info.rss,
                "memory_percent": round(
                    float(info.get("memory_percent") or 0), 2
                ),
            })

        except (
            psutil.NoSuchProcess,
            psutil.AccessDenied,
            psutil.ZombieProcess,
        ):
            continue

    processes.sort(
        key=lambda process: process["memory_bytes"],
        reverse=True,
    )

    return processes[:limit]


def collect_live_memory_analysis():
    """Build the live memory response."""
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ram": get_memory_data(),
        "swap": get_swap_data(),
        "processes": get_top_memory_processes(),
    }


def main():
    try:
        result = collect_live_memory_analysis()
        print(json.dumps(result))

    except Exception as error:
        print(
            f"Memory collection failed: {error}",
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
