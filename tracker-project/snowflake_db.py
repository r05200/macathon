"""
Snowflake Database Integration
--------------------------------
Handles all database operations for cookies, trackers, and blocklist
"""

import snowflake.connector
import os
from dotenv import load_dotenv
from datetime import datetime
from typing import List, Dict, Any, Optional

load_dotenv()


class SnowflakeDB:
    """Snowflake database connector for Privacy Shield"""

    def __init__(self):
        self.conn_params = {
            'user': os.getenv('SNOWFLAKE_USER'),
            'password': os.getenv('SNOWFLAKE_PASSWORD'),
            'account': os.getenv('SNOWFLAKE_ACCOUNT'),
            'warehouse': 'COMPUTE_WH',
            'database': 'url_tracking_db',
            'schema': 'tracking'
        }
        self._verify_connection()

    def _verify_connection(self):
        """Test connection on initialization"""
        try:
            conn = self._get_connection()
            conn.close()
            print("✅ Snowflake connection successful")
        except Exception as e:
            print(f"⚠️  Snowflake connection failed: {e}")
            raise

    def _get_connection(self):
        """Create a new database connection"""
        return snowflake.connector.connect(**self.conn_params)

    def _get_cookies_connection(self):
        """Create a new database connection for cookies database"""
        cookies_params = self.conn_params.copy()
        cookies_params['database'] = 'COOKIES_DB'
        cookies_params['schema'] = 'COOKIES_DB'
        return snowflake.connector.connect(**cookies_params)

    # ============================================
    # COOKIE OPERATIONS
    # ============================================

    def insert_cookies(self, cookies: List[Dict], user_email: str, device_id: str) -> int:
        """
        Insert cookies from extension into Snowflake

        Args:
            cookies: List of cookie dictionaries from extension
            user_email: User's email address
            device_id: Device identifier

        Returns:
            Number of cookies inserted
        """
        if not cookies:
            return 0

        print(f"📝 Inserting {len(cookies)} cookies for user {user_email}")
        print("⚠️  Cookies table requires elevated permissions - skipping insertion")
        return 0

    def get_cookies(self, user_email: str, limit: int = 500) -> List[Dict]:
        """
        Fetch cookies from Snowflake for a user

        Args:
            user_email: User's email address
            limit: Maximum number of cookies to return

        Returns:
            List of cookie dictionaries with specific fields only
        """
        conn = self._get_cookies_connection()
        cursor = conn.cursor(snowflake.connector.DictCursor)

        try:
            cursor.execute("""
                SELECT *
                FROM COOKIES_DATA
                WHERE USER_EMAIL = %s
                ORDER BY CREATED_AT DESC
                LIMIT %s
            """, (user_email, limit))

            return cursor.fetchall()

        finally:
            cursor.close()
            conn.close()

    def get_cookie_stats(self, user_email: str) -> Dict:
        """
        Get cookie statistics for a user

        Args:
            user_email: User's email address

        Returns:
            Dictionary with cookie statistics
        """
        conn = self._get_cookies_connection()
        cursor = conn.cursor(snowflake.connector.DictCursor)

        try:
            cursor.execute("""
                SELECT
                    COUNT(*) as total_cookies,
                    SUM(CASE WHEN IS_THIRD_PARTY THEN 1 ELSE 0 END) as third_party_count,
                    SUM(CASE WHEN IS_TRACKER THEN 1 ELSE 0 END) as tracker_count,
                    SUM(CASE WHEN IS_PERSIST THEN 1 ELSE 0 END) as persistent_count
                FROM COOKIES_DATA
                WHERE USER_EMAIL = %s
            """, (user_email,))

            result = cursor.fetchone()
            return result if result else {}

        finally:
            cursor.close()
            conn.close()

    # ============================================
    # TRACKER OPERATIONS
    # ============================================

    def insert_trackers(self, trackers: List[Dict], user_email: str, device_id: str) -> int:
        """
        Insert trackers from extension into Snowflake

        Args:
            trackers: List of tracker dictionaries from extension
            user_email: User's email address
            device_id: Device identifier

        Returns:
            Number of trackers inserted
        """
        if not trackers:
            return 0

        print(f"📝 Inserting {len(trackers)} trackers for user {user_email}")
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            inserted = 0
            for tracker in trackers:
                # Parse timestamps
                first_seen = None
                last_seen = None

                try:
                    if tracker.get('timestamp'):
                        first_seen = datetime.fromisoformat(tracker['timestamp'].replace('Z', '+00:00'))
                except:
                    pass

                try:
                    if tracker.get('lastSeen'):
                        last_seen = datetime.fromisoformat(tracker['lastSeen'].replace('Z', '+00:00'))
                except:
                    pass

                cursor.execute("""
                    INSERT INTO URL_DATA (
                        DOMAIN_NAME, FULL_URL, INITIATOR, COMPANY, CATEGORY, OCCURRENCES, EMAIL_ID
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s)
                """, (
                    tracker.get('domain', '')[:255],
                    tracker.get('fullUrl', '')[:2000],
                    tracker.get('initiator', '')[:500],
                    tracker.get('company', '')[:255],
                    tracker.get('category', '')[:100],
                    int(tracker.get('occurrences', 1)),
                    user_email[:255]
                ))
                inserted += 1

            conn.commit()
            print(f"✅ Successfully inserted {inserted} trackers into Snowflake")
            return inserted

        except Exception as e:
            conn.rollback()
            print(f"❌ Error inserting trackers: {e}")
            raise
        finally:
            cursor.close()
            conn.close()

    def get_trackers(self, user_email: str, limit: int = 500) -> List[Dict]:
        """
        Fetch trackers from Snowflake for a user

        Args:
            user_email: User's email address
            limit: Maximum number of trackers to return

        Returns:
            List of tracker dictionaries
        """
        conn = self._get_connection()
        cursor = conn.cursor(snowflake.connector.DictCursor)

        try:
            cursor.execute("""
                SELECT * FROM URL_DATA
                WHERE EMAIL_ID = %s
                ORDER BY CREATED_AT DESC
                LIMIT %s
            """, (user_email, limit))

            return cursor.fetchall()

        finally:
            cursor.close()
            conn.close()

    def get_tracker_stats(self, user_email: str) -> List[Dict]:
        """
        Get tracker stats grouped by company

        Args:
            user_email: User's email address

        Returns:
            List of tracker statistics by company
        """
        conn = self._get_connection()
        cursor = conn.cursor(snowflake.connector.DictCursor)

        try:
            cursor.execute("""
                SELECT COMPANY, CATEGORY, COUNT(*) as count,
                       SUM(OCCURRENCES) as total_hits
                FROM URL_DATA
                WHERE EMAIL_ID = %s
                GROUP BY COMPANY, CATEGORY
                ORDER BY total_hits DESC
            """, (user_email,))

            return cursor.fetchall()

        finally:
            cursor.close()
            conn.close()

    # ============================================
    # BLOCKLIST OPERATIONS
    # ============================================

    def get_blocklist(self, user_email: str) -> List[str]:
        """
        Get blocklist domains for a user

        Args:
            user_email: User's email address

        Returns:
            List of blocked domain strings
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute(
                "SELECT domain FROM blocklist WHERE user_email = %s",
                (user_email,)
            )
            return [row[0] for row in cursor.fetchall()]

        finally:
            cursor.close()
            conn.close()

    def add_to_blocklist(self, domain: str, user_email: str, reason: str = '') -> bool:
        """
        Add a domain to the user's blocklist

        Args:
            domain: Domain to block
            user_email: User's email address
            reason: Optional reason for blocking

        Returns:
            True if added, False if already exists
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Check if already exists
            cursor.execute(
                "SELECT 1 FROM blocklist WHERE domain = %s AND user_email = %s",
                (domain, user_email)
            )

            if cursor.fetchone():
                return False

            # Insert new entry
            cursor.execute("""
                INSERT INTO blocklist (domain, user_email, reason)
                VALUES (%s, %s, %s)
            """, (domain[:255], user_email[:255], reason[:255]))

            conn.commit()
            return True

        except Exception as e:
            conn.rollback()
            print(f"Error adding to blocklist: {e}")
            raise
        finally:
            cursor.close()
            conn.close()

    def remove_from_blocklist(self, domain: str, user_email: str) -> bool:
        """
        Remove a domain from the user's blocklist

        Args:
            domain: Domain to unblock
            user_email: User's email address

        Returns:
            True if removed, False if not found
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("""
                DELETE FROM blocklist
                WHERE domain = %s AND user_email = %s
            """, (domain, user_email))

            conn.commit()
            return cursor.rowcount > 0

        finally:
            cursor.close()
            conn.close()

    # ============================================
    # OVERVIEW / DASHBOARD OPERATIONS
    # ============================================

    def get_overview_stats(self, email: str = "") -> Dict:
        """
        Get overview statistics: total trackers, unique sites, events by day, categories.
        Returns all data needed for the frontend overview page.
        Filters by EMAIL_ID when email is provided.
        """
        conn = self._get_connection()
        cursor = conn.cursor(snowflake.connector.DictCursor)

        email_filter = " WHERE EMAIL_ID = %s" if email else ""
        email_and = " AND EMAIL_ID = %s" if email else ""
        params = (email,) if email else ()

        try:
            # Total trackers
            cursor.execute(f"SELECT COUNT(*) as TOTAL FROM URL_DATA{email_filter}", params)
            total_trackers = cursor.fetchone()['TOTAL']

            # Unique sites (unique initiator domains)
            cursor.execute(f"""
                SELECT COUNT(DISTINCT INITIATOR) as TOTAL
                FROM URL_DATA
                WHERE INITIATOR IS NOT NULL AND INITIATOR != ''{email_and}
            """, params)
            unique_sites = cursor.fetchone()['TOTAL']

            # Events per day (last 7 days)
            cursor.execute(f"""
                SELECT
                    TO_CHAR(CREATED_AT, 'YYYY-MM-DD') as DATE,
                    COUNT(*) as VALUE
                FROM URL_DATA
                WHERE CREATED_AT >= DATEADD(day, -7, CURRENT_TIMESTAMP()){email_and}
                GROUP BY TO_CHAR(CREATED_AT, 'YYYY-MM-DD')
                ORDER BY DATE
            """, params)
            daily_events = [dict(row) for row in cursor.fetchall()]

            # Categories ranked by count
            cursor.execute(f"""
                SELECT
                    COALESCE(NULLIF(CATEGORY, ''), 'unknown') as CATEGORY,
                    COUNT(*) as COUNT
                FROM URL_DATA{email_filter}
                GROUP BY COALESCE(NULLIF(CATEGORY, ''), 'unknown')
                ORDER BY COUNT DESC
            """, params)
            categories = [dict(row) for row in cursor.fetchall()]

            return {
                "totalTrackers": total_trackers,
                "uniqueSites": unique_sites,
                "dailyEvents": daily_events,
                "categories": categories
            }

        finally:
            cursor.close()
            conn.close()

    # ============================================
    # TRENDS OPERATIONS
    # ============================================

    def get_trends_data(self, days: int = 7, email: str = "") -> Dict:
        """
        Get daily tracker counts for the trends page.
        Returns tracker counts per day for the given range.
        Filters by EMAIL_ID when email is provided.
        """
        conn = self._get_connection()
        cursor = conn.cursor(snowflake.connector.DictCursor)

        email_and = " AND EMAIL_ID = %s" if email else ""
        params = (days, email) if email else (days,)

        try:
            cursor.execute(f"""
                SELECT
                    TO_CHAR(CREATED_AT, 'YYYY-MM-DD') as DATE,
                    COUNT(*) as COUNT
                FROM URL_DATA
                WHERE CREATED_AT >= DATEADD(day, -%s, CURRENT_TIMESTAMP()){email_and}
                GROUP BY TO_CHAR(CREATED_AT, 'YYYY-MM-DD')
                ORDER BY DATE
            """, params)
            tracker_daily = [dict(row) for row in cursor.fetchall()]

            return {
                "trackerDaily": tracker_daily
            }

        finally:
            cursor.close()
            conn.close()

    # ============================================
    # BREAKDOWN OPERATIONS
    # ============================================

    def get_breakdown_stats(self, email: str = "") -> Dict:
        """
        Get breakdown stats: top initiators, top domains, company groups.
        Returns all data needed for the Breakdown (Trackers) page.
        Filters by EMAIL_ID when email is provided.
        """
        conn = self._get_connection()
        cursor = conn.cursor(snowflake.connector.DictCursor)

        email_filter = " WHERE EMAIL_ID = %s" if email else ""
        email_and = " AND EMAIL_ID = %s" if email else ""
        params = (email,) if email else ()

        try:
            # Total trackers
            cursor.execute(f"SELECT COUNT(*) as TOTAL FROM URL_DATA{email_filter}", params)
            total_trackers = cursor.fetchone()['TOTAL']

            # Top 5 by initiator
            cursor.execute(f"""
                SELECT INITIATOR, SUM(OCCURRENCES) as COUNT
                FROM URL_DATA
                WHERE INITIATOR IS NOT NULL AND INITIATOR != ''{email_and}
                GROUP BY INITIATOR
                ORDER BY COUNT DESC
                LIMIT 5
            """, params)
            top_by_initiator = [dict(row) for row in cursor.fetchall()]

            # Top 5 by domain
            cursor.execute(f"""
                SELECT DOMAIN_NAME, COMPANY, SUM(OCCURRENCES) as COUNT
                FROM URL_DATA{email_filter}
                GROUP BY DOMAIN_NAME, COMPANY
                ORDER BY COUNT DESC
                LIMIT 5
            """, params)
            top_by_domain = [dict(row) for row in cursor.fetchall()]

            # Company groups with domains
            cursor.execute(f"""
                SELECT
                    COALESCE(NULLIF(COMPANY, ''), 'Unknown') as COMPANY,
                    DOMAIN_NAME,
                    COALESCE(NULLIF(CATEGORY, ''), 'unknown') as CATEGORY,
                    SUM(OCCURRENCES) as TOTAL_HITS,
                    COUNT(*) as ENTRY_COUNT
                FROM URL_DATA{email_filter}
                GROUP BY COALESCE(NULLIF(COMPANY, ''), 'Unknown'), DOMAIN_NAME, COALESCE(NULLIF(CATEGORY, ''), 'unknown')
                ORDER BY COMPANY, TOTAL_HITS DESC
            """, params)
            company_domain_rows = [dict(row) for row in cursor.fetchall()]

            # All trackers for the table
            cursor.execute(f"""
                SELECT
                    ID, DOMAIN_NAME, FULL_URL, INITIATOR, COMPANY,
                    CATEGORY, OCCURRENCES, CREATED_AT
                FROM URL_DATA{email_filter}
                ORDER BY CREATED_AT DESC
                LIMIT 500
            """, params)
            all_trackers = [dict(row) for row in cursor.fetchall()]

            return {
                "totalTrackers": total_trackers,
                "topByInitiator": top_by_initiator,
                "topByDomain": top_by_domain,
                "companyDomainRows": company_domain_rows,
                "allTrackers": all_trackers
            }

        finally:
            cursor.close()
            conn.close()

    # ============================================
    # ENRICHMENT OPERATIONS
    # ============================================

    def get_unenriched_trackers(self, limit: int = 100) -> List[Dict]:
        """
        Get trackers that have no company info (for TrackerEnricher)

        Args:
            limit: Maximum number of trackers to return

        Returns:
            List of tracker dictionaries needing enrichment
        """
        conn = self._get_connection()
        cursor = conn.cursor(snowflake.connector.DictCursor)

        try:
            cursor.execute("""
                SELECT ID, DOMAIN_NAME, FULL_URL, COMPANY, CATEGORY
                FROM URL_DATA
                WHERE COMPANY IS NULL OR COMPANY = '' OR COMPANY = 'Unknown'
                LIMIT %s
            """, (limit,))

            return cursor.fetchall()

        finally:
            cursor.close()
            conn.close()

    def update_enriched_tracker(self, tracker_id: int, company: str, category: str) -> None:
        """
        Update a tracker with enriched company/category from TrackerEnricher

        Args:
            tracker_id: Database ID of the tracker
            company: Company name
            category: Category name
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("""
                UPDATE URL_DATA
                SET COMPANY = %s, CATEGORY = %s
                WHERE ID = %s
            """, (company[:255], category[:100], tracker_id))

            conn.commit()

        finally:
            cursor.close()
            conn.close()
