#!/usr/bin/env python3
"""
Giuseppes Content Sync Agent - Phase 1 (read-only)
- Fetch source snapshots (best effort)
- Compare against current sheet-backed events
- Produce a diff/status report (no writes)
"""

from __future__ import annotations
import csv
import io
import json
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "automation" / "reports"
REPORTS.mkdir(parents=True, exist_ok=True)

SPEAKEASY_SITE_URL = "https://www.dopoora.com/"
FB_PAGE_URL = "https://www.facebook.com/giuseppesri"

SHEET_EVENTS_CSV = "https://docs.google.com/spreadsheets/d/1L8go61lEZQdFN_aStFguq90scUvnUfFxp0KMdPQGhCs/export?format=csv&gid=1506796078"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36"


@dataclass
class CheckResult:
    source: str
    ok: bool
    message: str
    items_found: int = 0


def fetch_text(url: str) -> str:
    req = Request(url, headers={"User-Agent": UA})
    with urlopen(req, timeout=25) as r:
        return r.read().decode("utf-8", errors="ignore")


def load_sheet_events() -> list[dict]:
    text = fetch_text(SHEET_EVENTS_CSV)
    rows = list(csv.DictReader(io.StringIO(text)))
    return rows


def scrape_dopo_events() -> CheckResult:
    try:
        html = fetch_text(SPEAKEASY_SITE_URL)

        # heuristic extraction from page text for event-like strings
        candidates = set()
        for pat in [r"(?i)(vinyl[^<]{0,80})", r"(?i)(secret menu[^<]{0,80})", r"(?i)(book now)"]:
            for m in re.finditer(pat, html):
                val = re.sub(r"\s+", " ", m.group(1)).strip()
                if len(val) > 2:
                    candidates.add(val)

        return CheckResult(
            source="DopoOra site",
            ok=True,
            message="Fetched and parsed with heuristic extractor.",
            items_found=len(candidates),
        )
    except Exception as e:
        return CheckResult(source="DopoOra site", ok=False, message=f"Fetch/parse failed: {e}")


def check_facebook_access() -> CheckResult:
    try:
        html = fetch_text(FB_PAGE_URL)
        # Facebook often returns JS shell/challenge; this indicates low-reliability scraping path
        blocked = ("login" in html.lower()) or ("javascript is not available" in html.lower())
        if blocked:
            return CheckResult(
                source="Facebook page",
                ok=False,
                message="Public HTML scraping is not reliable for events. Use Meta Graph API token flow.",
            )
        return CheckResult(
            source="Facebook page",
            ok=True,
            message="Page fetched, but event extraction remains low-confidence without API.",
        )
    except Exception as e:
        return CheckResult(source="Facebook page", ok=False, message=f"Fetch failed: {e}")


def build_report(sheet_rows: list[dict], checks: list[CheckResult]) -> str:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    active = [r for r in sheet_rows if (r.get("active", "yes").lower() != "no")]

    lines = []
    lines.append("# Giuseppes Content Sync — Phase 1 Read-Only Report")
    lines.append("")
    lines.append(f"Run time: {ts}")
    lines.append("")
    lines.append("## Sheet Snapshot")
    lines.append(f"- Total rows in Events sheet: {len(sheet_rows)}")
    lines.append(f"- Active rows: {len(active)}")
    lines.append("")

    lines.append("## Source Checks")
    for c in checks:
        status = "✅" if c.ok else "⚠️"
        lines.append(f"- {status} **{c.source}** — {c.message} (items found: {c.items_found})")
    lines.append("")

    lines.append("## Active Events (from Sheet)")
    if not active:
        lines.append("- None")
    else:
        for r in sorted(active, key=lambda x: int(x.get("sort") or 9999))[:25]:
            lines.append(f"- {r.get('date','')} | {r.get('time','')} | {r.get('title','')} | active={r.get('active','yes')}")
    lines.append("")

    lines.append("## Recommendation")
    lines.append("- Keep write automation OFF for now (Phase 1).")
    lines.append("- Use Meta Graph API for Facebook events ingestion in Phase 2.")
    lines.append("- Continue sheet-driven publishing as source of truth.")

    return "\n".join(lines)


def main():
    sheet_rows = []
    checks: list[CheckResult] = []

    try:
        sheet_rows = load_sheet_events()
        checks.append(CheckResult(source="Google Sheet Events CSV", ok=True, message="Readable", items_found=len(sheet_rows)))
    except Exception as e:
        checks.append(CheckResult(source="Google Sheet Events CSV", ok=False, message=f"Read failed: {e}"))

    checks.append(scrape_dopo_events())
    checks.append(check_facebook_access())

    report = build_report(sheet_rows, checks)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    out = REPORTS / f"sync-readonly-{stamp}.md"
    out.write_text(report, encoding="utf-8")
    print(out)


if __name__ == "__main__":
    main()
