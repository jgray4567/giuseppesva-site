import asyncio
import json
import os
import re
import sys
from datetime import datetime, timedelta
from bs4 import BeautifulSoup

try:
    from playwright.async_api import async_playwright
    USE_PLAYWRIGHT = True
except ImportError:
    import requests
    USE_PLAYWRIGHT = False

import dateparser


EVENTS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'events.json')
FB_PAGE_URL = "https://m.facebook.com/giuseppesri/events"


def load_existing_events():
    path = os.path.normpath(EVENTS_FILE)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []


def is_past_event(event):
    pd = event.get('parsedDate', '')
    if not pd:
        return False
    try:
        dt = datetime.fromisoformat(pd.replace('Z', '+00:00'))
        return dt < datetime.now(dt.tzinfo) - timedelta(hours=12)
    except (ValueError, TypeError):
        return False


def event_key(event):
    title = (event.get('title') or '').strip().lower()
    pd = event.get('parsedDate', '')[:10]
    return f"{pd}|{title}"


def merge_events(existing, scraped):
    """Merge: keep manual entries, add/update from Facebook, remove past events."""
    merged = {}
    
    for e in existing:
        k = event_key(e)
        if not is_past_event(e):
            merged[k] = e
    
    for e in scraped:
        k = event_key(e)
        if not is_past_event(e):
            if k in merged:
                existing_url = merged[k].get('url', '')
                scraped_url = e.get('url', '')
                if 'facebook.com/events/' in scraped_url and 'facebook.com/events/' not in existing_url:
                    merged[k]['url'] = scraped_url
                for field in ('venue', 'location', 'description'):
                    if e.get(field) and not merged[k].get(field):
                        merged[k][field] = e[field]
            else:
                merged[k] = e
    
    result = sorted(merged.values(), key=lambda e: e.get('parsedDate', '9999'))
    return result


async def scrape_facebook_events_playwright(url):
    events = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
            viewport={"width": 390, "height": 844}
        )
        page = await context.new_page()
        
        print(f"Navigating to {url}")
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(8000)
        
        for _ in range(5):
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(2000)
        
        raw_events = await page.evaluate("""
            () => {
                const links = document.querySelectorAll('a[href*="/events/"]');
                const seen = new Set();
                const results = [];
                for (const link of links) {
                    const href = link.href.split('?')[0];
                    if (seen.has(href)) continue;
                    seen.add(href);
                    const text = link.textContent.trim();
                    let parent = link.parentElement;
                    let context = '';
                    for (let i = 0; i < 5 && parent; i++) {
                        const pt = parent.textContent.trim();
                        if (pt.length > context.length && pt.length < 2000) {
                            context = pt;
                        }
                        parent = parent.parentElement;
                    }
                    results.push({ href, text, context: context || text });
                }
                return results;
            }
        """)
        
        await browser.close()
    
    print(f"Found {len(raw_events)} event links")
    
    for raw in raw_events:
        href = raw['href']
        if '/events/' not in href:
            continue
        
        href = href.split('?')[0].replace('m.facebook.com', 'www.facebook.com')
        context_text = raw['context'] or raw['text'] or ''
        
        date_match = re.search(
            r'(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+at\s+\d{1,2}:\d{2}\s*[AP]M\s*(?:EDT|EST|ET)?',
            context_text, re.IGNORECASE
        )
        if not date_match:
            date_match = re.search(
                r'(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}',
                context_text, re.IGNORECASE
            )
        
        parsed_date = None
        date_str = "TBD"
        if date_match:
            date_str = date_match.group(0)
            dp = dateparser.parse(date_str, settings={
                'TIMEZONE': 'US/Eastern',
                'RETURN_AS_TIMEZONE_AWARE': False,
                'PREFER_DATES_FROM': 'future'
            })
            if dp:
                parsed_date = dp
        
        title = "Giuseppe's Event"
        venue = "Giuseppe's Ristorante"
        location = "Giuseppe's Ristorante"
        
        parts = [p.strip() for p in re.split(r'[\n|·]', context_text) if p.strip() and len(p.strip()) > 2]
        other_parts = [p for p in parts if not re.match(r'^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)', p, re.IGNORECASE)
                       and 'interested' not in p.lower()
                       and 'people' not in p.lower()
                       and 'event by' not in p.lower()
                       and p != date_str]
        
        if other_parts:
            title = other_parts[0]
        if len(other_parts) > 1:
            venue = other_parts[1]
            loc_match = re.search(r'[·,]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})', venue)
            if loc_match:
                location = loc_match.group(1).strip()
        
        if parsed_date or date_str != "TBD":
            events.append({
                "date": date_str,
                "parsedDate": parsed_date.isoformat() + "Z" if parsed_date else "",
                "title": title,
                "description": title,
                "venue": venue,
                "location": location,
                "url": href
            })
            print(f"  Parsed: {date_str} | {title} | {venue}")
        else:
            print(f"  Skipped (no date found): {context_text[:80]}")
    
    return events


def scrape_facebook_events_requests(url):
    import requests as req
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15'
    }
    
    print(f"Fetching {url} (requests fallback)")
    resp = req.get(url, headers=headers, timeout=30)
    print(f"Status: {resp.status_code}")
    
    events = []
    soup = BeautifulSoup(resp.text, 'html.parser')
    for link in soup.find_all('a', href=re.compile(r'/events/\d+')):
        href = link.get('href', '').split('?')[0]
        if href.startswith('/'):
            href = 'https://www.facebook.com' + href
        href = href.replace('m.facebook.com', 'www.facebook.com')
        
        text = link.get_text(strip=True)
        if text and '/events/' in href and href not in [e['url'] for e in events]:
            date_match = re.search(
                r'(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}',
                text, re.IGNORECASE
            )
            parsed_date = None
            if date_match:
                parsed_date = dateparser.parse(date_match.group(0), settings={'PREFER_DATES_FROM': 'future'})
            
            events.append({
                "date": date_match.group(0) if date_match else text[:50],
                "parsedDate": parsed_date.isoformat() + "Z" if parsed_date else "",
                "title": text[:100],
                "description": text[:100],
                "venue": "Giuseppe's Ristorante",
                "location": "Giuseppe's Ristorante",
                "url": href
            })
    
    print(f"Found {len(events)} events via requests")
    return events


async def main():
    existing = load_existing_events()
    print(f"Loaded {len(existing)} existing events")
    
    if USE_PLAYWRIGHT:
        scraped = await scrape_facebook_events_playwright(FB_PAGE_URL)
    else:
        scraped = scrape_facebook_events_requests(FB_PAGE_URL)
    
    print(f"Scraped {len(scraped)} events from Facebook")
    
    merged = merge_events(existing, scraped)
    print(f"After merge: {len(merged)} upcoming events")
    
    path = os.path.normpath(EVENTS_FILE)
    existing_json = json.dumps(existing, indent=2, ensure_ascii=False, sort_keys=False)
    merged_json = json.dumps(merged, indent=2, ensure_ascii=False, sort_keys=False)
    
    if existing_json != merged_json:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(merged_json)
        print(f"Updated {path} with {len(merged)} events")
    else:
        print("No changes detected. Keeping existing events.json")


if __name__ == "__main__":
    asyncio.run(main())