from database.db_connection import save_system_metrics, save_process_metrics

import psutil
import time

def get_cpu_usage():
    cpu_usage = psutil.cpu_percent(interval=1)
    return cpu_usage

def get_memory_usage():
    memory = psutil.virtual_memory()
    return memory.percent # Percentage of RAM currently being used

def get_disk_usage():
    disk = psutil.disk_usage("/")
    return disk.percent

def get_network_usage():
    network = psutil.net_io_counters()
    return {'bytes_sent': network.bytes_sent, # commulative byte counts
            'bytes_received': network.bytes_recv
    }

def get_process_data():
    processes = []

    for process in psutil.process_iter(['pid', 'name', 'memory_percent']):
        try:
            process.cpu_percent(None)
            processes.append(process)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    time.sleep(1)

    process_data = []
    for process in processes:
        try:
            cpu = process.cpu_percent(None)
            memory = process.memory_percent()

            process_data.append({
                'pid': process.pid,
                'name': process.name(),
                'cpu_percent': cpu,
                'memory_percent': memory
            })

        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    return process_data     


def get_top_cpu_processes(processes, limit=5):
    return sorted(processes, key=lambda process: process['cpu_percent'], reverse=True)[: limit]

def get_top_memory_processes(processes, limit=5):
    return sorted(processes, key=lambda process: process['memory_percent'], reverse=True)[: limit]

def collect_system_metrics():
    cpu = get_cpu_usage()
    memory = get_memory_usage()
    disk = get_disk_usage()
    network = get_network_usage()

    processes = get_process_data()
    top_cpu = get_top_cpu_processes(processes)
    top_memory = get_top_memory_processes(processes)

    return {
        'cpu': cpu,
        'memory': memory,
        'disk': disk,
        'network': network,
        'processes': processes,
        'top_cpu_processes': top_cpu,
        'top_memory_processes': top_memory
    }

metrics = collect_system_metrics()



def create_snapshot():
    metrics = collect_system_metrics()

    snapshot = {
        'cpu': metrics['cpu'],
        'memory': metrics['memory'],
        'disk': metrics['disk'],
        'bytes_sent': metrics['network']['bytes_sent'],
        'bytes_received': metrics['network']['bytes_received'],
        'top_cpu_processes': metrics['top_cpu_processes'],
        'top_memory_processes': metrics['top_memory_processes']
    }
    return snapshot




while True:

    snapshot = create_snapshot()

    print("\nSystem Snapshot")
    print("----------------------")

    print(f"CPU Usage       : {snapshot['cpu']}%")
    print(f"RAM Usage       : {snapshot['memory']}%")
    print(f"Disk Usage      : {snapshot['disk']}%")
    print(f"Bytes Sent      : {snapshot['bytes_sent']}")
    print(f"Bytes Received  : {snapshot['bytes_received']}")

    print("\nTop 5 CPU Processes:")

    for process in snapshot['top_cpu_processes']:
        print(
            f"{process['name']} "
            f"CPU: {process['cpu_percent']}%"
        )

    print("\nTop 5 RAM Processes:")

    for process in snapshot['top_memory_processes']:
        print(
            f"{process['name']} "
            f"RAM: {process['memory_percent']}%"
        )

    snapshot_id = save_system_metrics(snapshot)

    save_process_metrics(snapshot_id, snapshot['top_cpu_processes'])

    print(f"\nSystem metrics saved! Snapshot ID: {snapshot_id}")
    print("Process metrics saved!")

    time.sleep(5)