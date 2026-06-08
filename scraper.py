#!/usr/bin/env python3
"""
Scrape NBA season records from Basketball Reference.
Outputs data/nba_data.json with cumulative win-loss differential per season.

Usage:
  python3 scraper.py              # scrape all 30 franchises
  python3 scraper.py BOS LAL      # scrape specific franchises
"""

import urllib.request
import re
import json
import time
import sys
import os

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# BBRef franchise abbreviation -> display name
# Each entry covers the franchise's full history (all city/name changes)
FRANCHISES = {
    "ATL": "Atlanta Hawks",
    "BOS": "Boston Celtics",
    "NJN": "Brooklyn Nets",
    "CHA": "Charlotte Hornets",
    "CHI": "Chicago Bulls",
    "CLE": "Cleveland Cavaliers",
    "DAL": "Dallas Mavericks",
    "DEN": "Denver Nuggets",
    "DET": "Detroit Pistons",
    "GSW": "Golden State Warriors",
    "HOU": "Houston Rockets",
    "IND": "Indiana Pacers",
    "LAC": "Los Angeles Clippers",
    "LAL": "Los Angeles Lakers",
    "MEM": "Memphis Grizzlies",
    "MIA": "Miami Heat",
    "MIL": "Milwaukee Bucks",
    "MIN": "Minnesota Timberwolves",
    "NOH": "New Orleans Pelicans",
    "NYK": "New York Knicks",
    "OKC": "Oklahoma City Thunder",
    "ORL": "Orlando Magic",
    "PHI": "Philadelphia 76ers",
    "PHO": "Phoenix Suns",
    "POR": "Portland Trail Blazers",
    "SAC": "Sacramento Kings",
    "SAS": "San Antonio Spurs",
    "TOR": "Toronto Raptors",
    "UTA": "Utah Jazz",
    "WAS": "Washington Wizards",
}


def fetch_html(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8")


def parse_nba_seasons(html: str) -> list[tuple[int, int, int]]:
    """
    Parse season rows from a BBRef franchise page.
    Returns list of (end_year, wins, losses) tuples, NBA seasons only, sorted ascending.
    """
    seasons = []
    for row in html.split("</tr>"):
        season_m = re.search(
            r'data-stat="season"[^>]*>.*?(\d{4})-\d{2}', row, re.DOTALL
        )
        if not season_m:
            continue
        lg_m = re.search(
            r'data-stat="lg_id"[^>]*>.*?<a[^>]*>([^<]+)</a>', row, re.DOTALL
        )
        wins_m = re.search(r'data-stat="wins"[^>]*>(\d+)', row)
        losses_m = re.search(r'data-stat="losses"[^>]*>(\d+)', row)

        if lg_m and wins_m and losses_m and lg_m.group(1).strip() == "NBA":
            end_year = int(season_m.group(1)) + 1  # 2024-25 -> 2025
            seasons.append((end_year, int(wins_m.group(1)), int(losses_m.group(1))))

    seasons.sort()
    return seasons


def cumulative_series(seasons: list[tuple[int, int, int]]) -> list[dict]:
    """Convert per-season W/L to cumulative win-loss differential."""
    result = []
    total = 0
    for year, wins, losses in seasons:
        total += wins - losses
        result.append({"year": year, "win_loss": total})
    return result


def scrape_franchise(abbr: str, display_name: str) -> list[dict]:
    url = f"https://www.basketball-reference.com/teams/{abbr}/"
    html = fetch_html(url)
    seasons = parse_nba_seasons(html)

    if not seasons:
        print(f"  WARNING: no NBA seasons found for {abbr}", file=sys.stderr)
        return []

    first_yr, last_yr = seasons[0][0], seasons[-1][0]
    print(f"  {display_name}: {len(seasons)} NBA seasons ({first_yr}–{last_yr})")
    return cumulative_series(seasons)


def main() -> None:
    out_path = os.path.join(os.path.dirname(__file__), "data", "nba_data.json")

    targets = sys.argv[1:] if len(sys.argv) > 1 else list(FRANCHISES.keys())

    unknown = [a for a in targets if a not in FRANCHISES]
    if unknown:
        print(f"Unknown abbreviations: {unknown}", file=sys.stderr)
        print(f"Valid: {sorted(FRANCHISES.keys())}", file=sys.stderr)
        sys.exit(1)

    # Load existing data so partial runs can be merged
    existing: dict = {}
    if os.path.exists(out_path) and len(targets) < len(FRANCHISES):
        with open(out_path) as f:
            existing = json.load(f)

    results: dict = dict(existing)

    for i, abbr in enumerate(targets):
        name = FRANCHISES[abbr]
        print(f"[{i+1}/{len(targets)}] Scraping {name} ({abbr})…")
        try:
            data = scrape_franchise(abbr, name)
            if data:
                results[name] = data
        except Exception as exc:
            print(f"  ERROR scraping {abbr}: {exc}", file=sys.stderr)

        if i < len(targets) - 1:
            time.sleep(3)  # respectful rate limiting

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nWrote {len(results)} franchises → {out_path}")


if __name__ == "__main__":
    main()
