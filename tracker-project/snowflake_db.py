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

        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            for cookie in cookies:
                # Parse expiration date
                exp_date = None
                if cookie.get('expirationDate'):
                    try:
                        exp_date = datetime.fromtimestamp(cookie['expirationDate'])
                    except:
                        exp_date = None

                cursor.execute("""
                    INSERT INTO cookies_data (
                        cookie_name, domain_name, path, set_by, initiator,
                        is_third_party, is_tracker, is_persistent, secure,
                        http_only, same_site, expiration_date, company,
                        category, classification, user_email, device_id, page_url
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (
                    cookie.get('name', '')[:255],
                    cookie.get('domain', '')[:255],
                    cookie.get('path', '/')[:500],
                    cookie.get('setBy', '')[:255],
                    cookie.get('initiator', '')[:500],
                    bool(cookie.get('isThirdParty', False)),
                    bool(cookie.get('isTracker', False)),
                    bool(cookie.get('persistent', False)),
                    bool(cookie.get('secure', False)),
                    bool(cookie.get('httpOnly', False)),
                    cookie.get('sameSite', 'None')[:20],
                    exp_date,
                    cookie.get('company', '')[:255],
                    cookie.get('category', '')[:100],
                    cookie.get('classification', '')[:50],
                    user_email[:255],
                    device_id[:100],
                    cookie.get('pageUrl', '')[:1000]
                ))

            conn.commit()
            return len(cookies)

        except Exception as e:
            conn.rollback()
            print(f"Error inserting cookies: {e}")
            raise
        finally:
            cursor.close()
            conn.close()

    def get_cookies(self, user_email: str, limit: int = 500) -> List[Dict]:
        """
        Fetch cookies from Snowflake for a user

        Args:
            user_email: User's email address
            limit: Maximum number of cookies to return

        Returns:
            List of cookie dictionaries with specific fields only
        """
        conn = self._get_connection()
        cursor = conn.cursor(snowflake.connector.DictCursor)

        try:
            cursor.execute("""
                SELECT
                    id,
                    cookie_name,
                    domain_name,
                    company,
                    category,
                    is_tracker,
                    is_third_party,
                    is_persistent,
                    expiration_date,
                    page_url,
                    user_email,
                    detected_at
                FROM cookies_data
                WHERE user_email = %s
                ORDER BY detected_at DESC
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
        conn = self._get_connection()
        cursor = conn.cursor(snowflake.connector.DictCursor)

        try:
            cursor.execute("""
                SELECT
                    COUNT(*) as total_cookies,
                    SUM(CASE WHEN is_third_party THEN 1 ELSE 0 END) as third_party_count,
                    SUM(CASE WHEN is_tracker THEN 1 ELSE 0 END) as tracker_count,
                    SUM(CASE WHEN is_persistent THEN 1 ELSE 0 END) as persistent_count
                FROM cookies_data
                WHERE user_email = %s
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

        conn = self._get_connection()
        cursor = conn.cursor()

        try:
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
                    INSERT INTO trackers_data (
                        domain, full_url, request_type, initiator, is_third_party,
                        is_known_tracker, is_blocked, company, category,
                        detection_source, occurrences, user_email, device_id,
                        first_seen, last_seen
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (
                    tracker.get('domain', '')[:255],
                    tracker.get('fullUrl', '')[:2000],
                    tracker.get('type', '')[:50],
                    tracker.get('initiator', '')[:500],
                    bool(tracker.get('isThirdParty', False)),
                    bool(tracker.get('isKnownTracker', False)),
                    bool(tracker.get('isBlocked', False)),
                    tracker.get('company', '')[:255],
                    tracker.get('category', '')[:100],
                    tracker.get('source', '')[:50],
                    int(tracker.get('occurrences', 1)),
                    user_email[:255],
                    device_id[:100],
                    first_seen,
                    last_seen
                ))

            conn.commit()
            return len(trackers)

        except Exception as e:
            conn.rollback()
            print(f"Error inserting trackers: {e}")
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
                SELECT * FROM trackers_data
                WHERE user_email = %s
                ORDER BY detected_at DESC
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
                SELECT company, category, COUNT(*) as count,
                       SUM(occurrences) as total_hits
                FROM trackers_data
                WHERE user_email = %s
                GROUP BY company, category
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
                SELECT id, domain, full_url, company, category
                FROM trackers_data
                WHERE company IS NULL OR company = '' OR company = 'Unknown'
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
                UPDATE trackers_data
                SET company = %s, category = %s
                WHERE id = %s
            """, (company[:255], category[:100], tracker_id))

            conn.commit()

        finally:
            cursor.close()
            conn.close()
