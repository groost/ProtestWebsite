import requests
import time
import re
import json
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_URL = "https://politics1.com/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (research scraper; contact: youremail@example.com)"
}

STATE_LINK_PATTERN = re.compile(r'^[a-z]{2}\.htm$', re.IGNORECASE)
DEMOCRAT_PATTERN = re.compile(r'\(D\)', re.IGNORECASE)


def get_state_links(index_page):
    """Get state page URLs from a Politics1 index page."""
    url = urljoin(BASE_URL, index_page)
    res = requests.get(url, headers=HEADERS)
    res.raise_for_status()

    soup = BeautifulSoup(res.text, "html.parser")
    links = set()

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if STATE_LINK_PATTERN.match(href):
            links.add(urljoin(BASE_URL, href))

    return sorted(links)


def scrape_state_page(state_url):
    """Scrape Democratic candidate websites from a state page."""
    res = requests.get(state_url, headers=HEADERS)
    res.raise_for_status()

    soup = BeautifulSoup(res.text, "html.parser")
    results = []

    for li in soup.find_all("li"):
        text = li.get_text(" ", strip=True)

        if not DEMOCRAT_PATTERN.search(text):
            continue

        link = li.find("a", href=True)
        if not link:
            continue

        candidate = text.split("(")[0].strip()
        website = link["href"].strip()
        state = state_url.split("/")[-1].replace(".htm", "").upper()

        results.append({
            "state_page": state_url,
            "candidate": candidate,
            "website": website,
            "state": state
        })

    return results


def main():
    house_states = get_state_links("congress.htm")
    senate_states = get_state_links("senate.htm")

    print(f"House state pages: {len(house_states)}")
    print(f"Senate state pages: {len(senate_states)}")

    data = {
        "house": [],
        "senate": []
    }

    for url in house_states:
        print(f"Scraping House → {url}")
        try:
            data["house"].extend(scrape_state_page(url))
        except Exception as e:
            print(f"Error: {e}")
        time.sleep(2)

    for url in senate_states:
        print(f"Scraping Senate → {url}")
        try:
            data["senate"].extend(scrape_state_page(url))
        except Exception as e:
            print(f"Error: {e}")
        time.sleep(2)

    with open("dem_campaign_sites.json", "w") as f:
        json.dump(data, f, indent=2)

    print("\nSaved dem_campaign_sites.json")
    print(f"House candidates: {len(data['house'])}")
    print(f"Senate candidates: {len(data['senate'])}")


if __name__ == "__main__":
    main()