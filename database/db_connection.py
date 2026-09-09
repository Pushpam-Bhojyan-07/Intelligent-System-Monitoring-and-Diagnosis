import mysql.connector

def get_connection():
    connection = mysql.connector.connect(
        host="localhost",
        user="root",
        password="pushpamvishesh@123",
        database="sysguard",
    )
    return connection



def save_system_metrics(snapshot):
    connection = get_connection()
    cursor = connection.cursor()

    query = "INSERT INTO system_metrics (cpu_usage, memory_usage, disk_usage, bytes_sent, bytes_received) VALUES(%s, %s, %s, %s, %s)"

    values = (
        snapshot['cpu'],
        snapshot['memory'],
        snapshot['disk'],
        snapshot['bytes_sent'],
        snapshot['bytes_received']
    )

    cursor.execute(query, values)
    connection.commit()

    snapshot_id = cursor.lastrowid

    cursor.close()
    connection.close()

    return snapshot_id



def save_process_metrics(snapshot_id, processes):
    connection = get_connection()
    cursor = connection.cursor()

    query = "INSERT INTO process_metrics(system_metric_id, pid, process_name, cpu_usage, memory_usage) VALUES(%s, %s, %s, %s, %s)"

    for process in processes:
        values = (
            snapshot_id,
            process['pid'],
            process['name'],
            process['cpu_percent'],
            process['memory_percent']
        )
        cursor.execute(query, values)
    
    connection.commit()
    cursor.close()
    connection.close()


def get_latest_system_metrics():
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    query="SELECT * FROM system_metrics ORDER BY id DESC LIMIT 1"

    cursor.execute(query)
    result = cursor.fetchone()
    cursor.close()
    connection.close()

    return result


def get_process_metrics(system_metric_id):
    connection = get_connection()
    cursor = connection.cursor()

    query = "SELECT * FROM process_metrics WHERE system_metric_id = %s ORDER BY cpu_usage DESC"

    cursor.execute(query, (system_metric_id,))
    result = cursor.fetchall()

    cursor.close()
    connection.close()

    return result

connection = get_connection()
print("Connected to MySQL successfully!!")

latest = get_latest_system_metrics()
print(latest)

processes = get_process_metrics(latest['id'])

print("\nProcesses:")
for process in processes:
    print(process)

connection.close()