# ============================================================
# OS and DBMS Correlation Analysis
# This module analyzes relationships between operating
# system resource utilization and database performance.
# ============================================================
# Calculate the relationship between OS resource metrics
# and DBMS performance metrics.
import math
from database.db_connection import get_connection

def get_os_metrics(start_time, end_time):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                AVG(cpu_usage) AS avg_cpu,
                AVG(memory_usage) AS avg_memory,
                COUNT(*) AS sample_count
            FROM system_metrics
            WHERE timestamp > %s
            AND timestamp <= %s
        """, (start_time, end_time))

        return cursor.fetchone()

    finally:
        cursor.close()
        connection.close()


def get_dbms_metrics():
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                interval_start,
                interval_end,
                COALESCE(SUM(execution_count), 0) AS total_executions,
                COALESCE(SUM(total_latency_ms), 0) AS total_latency_ms,
                COALESCE(SUM(rows_examined), 0) AS total_rows_examined,
                COALESCE(SUM(rows_sent), 0) AS total_rows_sent
            FROM dbms_query_metrics
            GROUP BY interval_start, interval_end
            ORDER BY interval_end
        """)

        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()


def calculate_average_latency(total_latency, total_executions):
    if total_executions == 0:
        return 0

    return total_latency / total_executions


def calculate_pearson_correlation(x_values, y_values):
    n = len(x_values)

    if n != len(y_values) or n < 2:
        return None

    mean_x = sum(x_values) / n
    mean_y = sum(y_values) / n

    numerator = 0
    sum_x_squared = 0
    sum_y_squared = 0

    for i in range(n):
        x_diff = x_values[i] - mean_x
        y_diff = y_values[i] - mean_y

        numerator += x_diff * y_diff
        sum_x_squared += x_diff ** 2
        sum_y_squared += y_diff ** 2

    denominator = math.sqrt(sum_x_squared * sum_y_squared)

    if denominator == 0:
        return None

    return numerator / denominator

def interpret_correlation(value):

    if value is None:
        return "Insufficient data or no variation"

    strength = abs(value)

    if strength < 0.2:
        level = "Very weak"
    elif strength < 0.4:
        level = "Weak"
    elif strength < 0.6:
        level = "Moderate"
    elif strength < 0.8:
        level = "Strong"
    else:
        level = "Very strong"

    if value > 0:
        direction = "positive"
    elif value < 0:
        direction = "negative"
    else:
        direction = "no"

    if value == 0:
        return "No linear correlation"

    return f"{level} {direction} correlation"

def build_correlation_dataset():
    dbms_records = get_dbms_metrics()
    dataset = []

    for record in dbms_records:
        os_metrics = get_os_metrics(
            record["interval_start"],
            record["interval_end"]
        )

        # Skip intervals without matching OS samples.
        if os_metrics["sample_count"] == 0:
            continue

        avg_latency = calculate_average_latency(
            float(record["total_latency_ms"]),
            int(record["total_executions"])
        )

        dataset.append({
            "interval_start": record["interval_start"],
            "interval_end": record["interval_end"],
            "avg_cpu": float(os_metrics["avg_cpu"]),
            "avg_memory": float(os_metrics["avg_memory"]),
            "total_executions": int(record["total_executions"]),
            "avg_latency": avg_latency,
            "rows_examined": int(record["total_rows_examined"])
        })

    return dataset


def analyze_correlations(dataset):

    cpu_values = [record["avg_cpu"] for record in dataset]
    memory_values = [record["avg_memory"] for record in dataset]
    latency_values = [record["avg_latency"] for record in dataset]
    execution_values = [record["total_executions"] for record in dataset]
    rows_examined_values = [record["rows_examined"] for record in dataset]

    correlations = {
        "CPU vs Query Latency": calculate_pearson_correlation(
            cpu_values, latency_values
        ),

        "Memory vs Query Latency": calculate_pearson_correlation(
            memory_values, latency_values
        ),

        "CPU vs Query Executions": calculate_pearson_correlation(
            cpu_values, execution_values
        ),

        "Memory vs Rows Examined": calculate_pearson_correlation(
            memory_values, rows_examined_values
        )
    }

    return correlations



if __name__ == "__main__":
    dataset = build_correlation_dataset()

    print("\n========== OS-DBMS CORRELATION DATA ==========")
    print("Matched intervals:", len(dataset))

    for record in dataset[-10:]:
        print(record)

    correlations = analyze_correlations(dataset)

    print("\n========== OS-DBMS CORRELATION ANALYSIS ==========")

    for name, value in correlations.items():
        if value is None:
            print(f"{name}: Cannot calculate correlation")
        else:
            print(f"{name}: {value:.4f}")
            print(f"Interpretation: {interpret_correlation(value)}")