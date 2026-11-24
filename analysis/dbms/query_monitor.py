from datetime import datetime

from database.db_connection import get_connection


def collect_dbms_metrics():
    """
    Collect MySQL statement statistics and calculate interval metrics.

    The first collection establishes a baseline.
    Subsequent collections calculate differences from that baseline.
    """

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        # Read cumulative statement statistics from MySQL.
        cursor.execute("""
            SELECT
                DIGEST,
                SCHEMA_NAME,
                DIGEST_TEXT,
                COUNT_STAR,
                SUM_TIMER_WAIT,
                SUM_ROWS_EXAMINED,
                SUM_ROWS_SENT
            FROM performance_schema.events_statements_summary_by_digest
            WHERE SCHEMA_NAME = %s
            AND DIGEST IS NOT NULL
            AND DIGEST_TEXT IS NOT NULL

            AND DIGEST_TEXT NOT LIKE '%events_statements_summary_by_digest%'
            AND DIGEST_TEXT NOT LIKE '%dbms_query_snapshots%'
            AND DIGEST_TEXT NOT LIKE '%dbms_query_metrics%'
            AND DIGEST_TEXT NOT LIKE 'SET %'
            AND DIGEST_TEXT NOT LIKE '%first_seen%'
            AND DIGEST_TEXT NOT LIKE '%INSERT INTO `system_metrics`%'
            AND DIGEST_TEXT NOT LIKE '%INSERT INTO `process_metrics`%'
            AND DIGEST_TEXT NOT LIKE 'COMMIT%'
            AND DIGEST_TEXT NOT LIKE 'ROLLBACK%'
            AND DIGEST_TEXT NOT LIKE 'SHOW %'
            AND DIGEST_TEXT NOT LIKE 'CREATE %'
            AND DIGEST_TEXT NOT LIKE 'SELECT SCHEMA%';
        """, ("sysguard",))

        current_rows = cursor.fetchall()
        captured_at = datetime.now()

        metrics_saved = 0
        baselines_created = 0

        for row in current_rows:
            digest = row["DIGEST"]

            current_count = int(row["COUNT_STAR"] or 0)
            current_time = int(row["SUM_TIMER_WAIT"] or 0)
            current_examined = int(row["SUM_ROWS_EXAMINED"] or 0)
            current_sent = int(row["SUM_ROWS_SENT"] or 0)

            # Find the previous cumulative snapshot.
            cursor.execute("""
                SELECT
                    count_star,
                    sum_timer_wait,
                    sum_rows_examined,
                    sum_rows_sent,
                    captured_at
                FROM dbms_query_snapshots
                WHERE digest = %s
            """, (digest,))

            previous = cursor.fetchone()

            # First observation: establish a baseline.
            if previous is None:
                cursor.execute("""
                    INSERT INTO dbms_query_snapshots (
                        digest,
                        schema_name,
                        digest_text,
                        count_star,
                        sum_timer_wait,
                        sum_rows_examined,
                        sum_rows_sent,
                        captured_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    digest,
                    row["SCHEMA_NAME"],
                    row["DIGEST_TEXT"],
                    current_count,
                    current_time,
                    current_examined,
                    current_sent,
                    captured_at
                ))

                baselines_created += 1
                continue

            previous_count = int(previous["count_star"])
            previous_time = int(previous["sum_timer_wait"])
            previous_examined = int(previous["sum_rows_examined"])
            previous_sent = int(previous["sum_rows_sent"])

            # Performance Schema counters can reset.
            # If they decrease, establish a new baseline.
            counters_reset = (
                current_count < previous_count
                or current_time < previous_time
                or current_examined < previous_examined
                or current_sent < previous_sent
            )

            if counters_reset:
                cursor.execute("""
                    UPDATE dbms_query_snapshots
                    SET
                        schema_name = %s,
                        digest_text = %s,
                        count_star = %s,
                        sum_timer_wait = %s,
                        sum_rows_examined = %s,
                        sum_rows_sent = %s,
                        captured_at = %s
                    WHERE digest = %s
                """, (
                    row["SCHEMA_NAME"],
                    row["DIGEST_TEXT"],
                    current_count,
                    current_time,
                    current_examined,
                    current_sent,
                    captured_at,
                    digest
                ))

                baselines_created += 1
                continue

            # Calculate interval differences.
            execution_count = current_count - previous_count
            time_difference = current_time - previous_time
            rows_examined = current_examined - previous_examined
            rows_sent = current_sent - previous_sent

            # Convert picoseconds into milliseconds.
            total_latency_ms = time_difference / 1_000_000_000

            avg_latency_ms = (
                total_latency_ms / execution_count
                if execution_count > 0
                else 0
            )

            # Save only intervals containing executions.
            if execution_count > 0:
                cursor.execute("""
                    INSERT INTO dbms_query_metrics (
                        digest,
                        schema_name,
                        digest_text,
                        interval_start,
                        interval_end,
                        execution_count,
                        total_latency_ms,
                        avg_latency_ms,
                        rows_examined,
                        rows_sent
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    digest,
                    row["SCHEMA_NAME"],
                    row["DIGEST_TEXT"],
                    previous["captured_at"],
                    captured_at,
                    execution_count,
                    total_latency_ms,
                    avg_latency_ms,
                    rows_examined,
                    rows_sent
                ))

                metrics_saved += 1

            # Update the cumulative baseline.
            cursor.execute("""
                UPDATE dbms_query_snapshots
                SET
                    schema_name = %s,
                    digest_text = %s,
                    count_star = %s,
                    sum_timer_wait = %s,
                    sum_rows_examined = %s,
                    sum_rows_sent = %s,
                    captured_at = %s
                WHERE digest = %s
            """, (
                row["SCHEMA_NAME"],
                row["DIGEST_TEXT"],
                current_count,
                current_time,
                current_examined,
                current_sent,
                captured_at,
                digest
            ))

        connection.commit()

        return {
            "queries_observed": len(current_rows),
            "baselines_created": baselines_created,
            "metrics_saved": metrics_saved,
            "captured_at": captured_at
        }

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()


import time


def run_continuous_monitoring(interval=5):
    """Collect DBMS query metrics continuously."""

    print("Starting SysGuard DBMS monitoring...")

    try:
        while True:
            result = collect_dbms_metrics()

            print(
                f"[{result['captured_at']}] "
                f"Patterns: {result['queries_observed']} | "
                f"Saved: {result['metrics_saved']}"
            )

            time.sleep(interval)

    except KeyboardInterrupt:
        print("\nDBMS monitoring stopped.")



if __name__ == "__main__":
    run_continuous_monitoring(interval=5)