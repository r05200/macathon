# Snowflake module — connect and run queries, return results for FastAPI

import os

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import snowflake.connector


def get_conn():
    """Return a new Snowflake connection using .env credentials."""
    conn = snowflake.connector.connect(
        user=os.getenv("SNOWFLAKE_USER"),
        password=os.getenv("SNOWFLAKE_PASSWORD"),
        account=os.getenv("SNOWFLAKE_ACCOUNT"),
        warehouse="COMPUTE_WH",
    )
    return conn


def run_query(sql):
    """
    Run a SQL string, return rows as list of dicts (column name -> value).
    Caller can pass any SELECT; connection is opened and closed inside.
    """
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(sql)
        columns = [d[0] for d in cur.description]
        rows = cur.fetchall()
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cur.close()
        conn.close()


def get_url_data():
    """Run the predefined queries (one per execute); return all result sets for FastAPI."""
    query1 = """
SELECT 
    company,
    SUM(occurrences) as total_occurrences
FROM url_tracking_db.tracking.url_data
WHERE created_at >= DATEADD(day, -7, CURRENT_TIMESTAMP())
GROUP BY company
ORDER BY total_occurrences DESC
LIMIT 5
"""
    query2 = """
SELECT 
    category,
    SUM(occurrences) as total_occurrences,
    COUNT(DISTINCT company) as unique_companies
FROM url_tracking_db.tracking.url_data
GROUP BY category
ORDER BY total_occurrences DESC
LIMIT 5
"""
    query3 = """
SELECT 
    company,
    SUM(CASE WHEN created_at >= DATEADD(day, -7, CURRENT_TIMESTAMP()) 
        THEN occurrences ELSE 0 END) as last_week,
    SUM(CASE WHEN created_at >= DATEADD(day, -14, CURRENT_TIMESTAMP()) 
             AND created_at < DATEADD(day, -7, CURRENT_TIMESTAMP())
        THEN occurrences ELSE 0 END) as week_before,
    CASE 
        WHEN week_before = 0 THEN 999.9
        ELSE ROUND(((last_week - week_before) * 100.0 / week_before), 1)
    END as percent_change
FROM url_tracking_db.tracking.url_data
WHERE created_at >= DATEADD(day, -14, CURRENT_TIMESTAMP())
GROUP BY company
HAVING last_week > 0
ORDER BY percent_change DESC
LIMIT 5
"""
    query4 = """
WITH monthly_stats AS (
    SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(DISTINCT company) as unique_trackers,
        SUM(occurrences) as total_tracking
    FROM url_tracking_db.tracking.url_data
    WHERE email_id = 'user@example.com'
    GROUP BY DATE_TRUNC('month', created_at)
)
SELECT 
    TO_CHAR(month, 'YYYY-MM') as month,
    unique_trackers,
    total_tracking,
    LAG(unique_trackers) OVER (ORDER BY month) as prev_month_trackers,
    unique_trackers - LAG(unique_trackers) OVER (ORDER BY month) as new_trackers_added,
    CASE 
        WHEN LAG(unique_trackers) OVER (ORDER BY month) = 0 THEN 0
        ELSE ROUND((unique_trackers * 100.0 / LAG(unique_trackers) OVER (ORDER BY month)) - 100, 1)
    END as privacy_decay_percent
FROM monthly_stats
ORDER BY month DESC
LIMIT 6
"""
    return {
        "by_company": run_query(query1),
        "by_category": run_query(query2),
        "week_over_week_change": run_query(query3),
        "monthly_privacy_stats": run_query(query4),
    }
