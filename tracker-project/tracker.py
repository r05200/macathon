# modules/tracker_enricher.py

import requests

class TrackerEnricher:
    def __init__(self):
        """
        Load tracker database
        """
        print("📥 Loading tracker database...")
        self._load_database()
    
    def _load_database(self):
        """Download DuckDuckGo tracker database"""
        try:
            url = "https://raw.githubusercontent.com/duckduckgo/tracker-radar/main/build-data/generated/entity_map.json"
            response = requests.get(url, timeout=10)
            self.tracker_db = response.json()
            print(f"✅ Loaded {len(self.tracker_db)} companies")
        except Exception as e:
            print(f"❌ Error: {e}")
            self.tracker_db = {}
    
    def enrich(self, tracker_data):
        """
        Fill in missing company and category
        
        Input: {
            "domain": "doubleclick.net",
            "url": "https://doubleclick.net/track",
            "company": "",
            "category": "",
            "occurrences": 5
        }
        
        Output: {
            "domain": "doubleclick.net",
            "url": "https://doubleclick.net/track",
            "company": "Google LLC",
            "category": "Advertising",
            "occurrences": 5
        }
        """
        # If company already filled, return as-is
        if tracker_data.get('company') and tracker_data['company'] != "":
            print(f"✅ {tracker_data['domain']} already has company info")
            return tracker_data
        
        # Otherwise, look it up
        domain = self._clean_domain(tracker_data['domain'])
        
        # Search in database
        for company_name, data in self.tracker_db.items():
            properties = data.get('properties', [])
            
            # Check if domain matches
            for prop in properties:
                if domain in prop or prop in domain:
                    # Found it! Fill in the data
                    tracker_data['company'] = company_name
                    tracker_data['category'] = self._get_category(company_name)
                    print(f"✅ Enriched {domain} → {company_name}")
                    return tracker_data
        
        # Not found - mark as Unknown
        tracker_data['company'] = "Unknown"
        tracker_data['category'] = "Unknown"
        print(f"⚠️ {domain} not found in database")
        return tracker_data
    
    def _clean_domain(self, domain):
        """Clean domain name"""
        return domain.replace('www.', '').replace('https://', '').replace('http://', '').split('/')[0]
    
    def _get_category(self, company_name):
        """Determine category from company name"""
        company_lower = company_name.lower()
        
        if any(word in company_lower for word in ['google', 'facebook', 'doubleclick', 'ad', 'advertising']):
            return "Advertising"
        elif any(word in company_lower for word in ['analytics', 'metric', 'chartbeat']):
            return "Analytics"
        elif any(word in company_lower for word in ['social', 'twitter', 'instagram', 'tiktok']):
            return "Social"
        else:
            return "Tracking"


# Test it
if __name__ == "__main__":
    enricher = TrackerEnricher()
    
    # Test Case 1: Empty company/category
    test1 = {
        "domain": "doubleclick.net",
        "url": "https://doubleclick.net/track",
        "company": "",
        "category": "",
        "occurrences": 5
    }
    result1 = enricher.enrich(test1)
    print("\nTest 1 Result:")
    print(result1)
    
    # Test Case 2: Already has company
    test2 = {
        "domain": "amazon.com",
        "url": "https://amazon.com",
        "company": "Amazon",
        "category": "E-commerce",
        "occurrences": 2
    }
    result2 = enricher.enrich(test2)
    print("\nTest 2 Result:")
    print(result2)
    
    # Test Case 3: Unknown tracker
    test3 = {
        "domain": "random-tracker-xyz.com",
        "url": "https://random-tracker-xyz.com/pixel",
        "company": "",
        "category": "",
        "occurrences": 1
    }
    result3 = enricher.enrich(test3)
    print("\nTest 3 Result:")
    print(result3)