import os
from dotenv import load_dotenv
import mysql.connector

load_dotenv()

def get_connection():
    connection = mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        port=os.getenv("DB_PORT")
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




from datetime import datetime


def save_process_metrics(snapshot_id, processes):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        insert_query = """
            INSERT INTO process_metrics (
                system_metric_id,
                pid,
                process_name,
                cpu_usage,
                memory_usage,
                first_seen
            )
            VALUES (%s, %s, %s, %s, %s, %s)
        """

        for process in processes:
            pid = process["pid"]

            cursor.execute(
                """
                SELECT first_seen
                FROM process_metrics
                WHERE pid = %s AND first_seen IS NOT NULL
                ORDER BY first_seen ASC
                LIMIT 1
                """,
                (pid,)
            )

            existing = cursor.fetchone()

            if existing:
                first_seen = existing["first_seen"]
            else:
                first_seen = process.get("first_seen_at")

                if isinstance(first_seen, str):
                    first_seen = datetime.fromisoformat(
                        first_seen.replace("Z", "+00:00")
                    )

                if first_seen is not None and first_seen.tzinfo is not None:
                    first_seen = first_seen.replace(tzinfo=None)

                if first_seen is None:
                    first_seen = datetime.now()

            values = (
                snapshot_id,
                pid,
                process["name"],
                process["cpu_percent"],
                process["memory_percent"],
                first_seen
            )

            cursor.execute(insert_query, values)

        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
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


def get_historical_process_metrics(pid, limit=100):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    query = """
        SELECT
            pid,
            process_name,
            timestamp,
            cpu_usage,
            memory_usage
        FROM process_metrics
        WHERE pid = %s
        ORDER BY timestamp DESC
        LIMIT %s
    """

    try:
        cursor.execute(query, (pid, limit))
        return cursor.fetchall()
    finally:
        cursor.close()
        connection.close()



def get_all_historical_process_metrics(limit=500):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    query = """
        SELECT
            pid,
            process_name,
            timestamp,
            cpu_usage,
            memory_usage
        FROM process_metrics
        ORDER BY timestamp DESC
        LIMIT %s
    """

    try:
        cursor.execute(query, (limit,))
        return cursor.fetchall()
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    connection = get_connection()
    print("Connected to MySQL successfully!!")

    latest = get_latest_system_metrics()
    print(latest)

    if latest:
        processes = get_process_metrics(latest['id'])

        print("\nProcesses:")
        for process in processes:
            print(process)

    connection.close()