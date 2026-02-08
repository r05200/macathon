import snowflake.connector
import os
from dotenv import load_dotenv

load_dotenv()

Connect
conn = snowflake.connector.connect(
    user=os.getenv('SNOWFLAKE_USER'),
    password=os.getenv('SNOWFLAKE_PASSWORD'),
    account=os.getenv('SNOWFLAKE_ACCOUNT'),
    warehouse='COMPUTE_WH'
)

cursor = conn.cursor()
print("✅ Connected to Snowflake\n")

# Run your query
query = """
SELECT * FROM url_tracking_db.tracking.url_data LIMIT 5
"""

print(f"Running query:\n{query}\n")

cursor.execute(query)
results = cursor.fetchall()

# Print results
print("Results:")
print("-" * 50)
for row in results:
    print(row)

Close
cursor.close()
conn.close()
print("\n✅ Done")