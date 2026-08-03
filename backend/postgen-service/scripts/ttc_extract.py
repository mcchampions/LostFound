#!/usr/bin/env python
"""Extract single-font TTFs from a TTC using FontTools.

Example:
  python scripts/ttc_extract.py \
    --ttc fonts/PingFang.ttc \
    --out-dir fonts/extracted \
    --match "PingFang SC" \
    --styles "Regular" "Semibold"

Notes:
- Satori/opentype.js (used by postgen) does NOT support .ttc (ttcf). It needs .ttf/.otf.
- This script writes .ttf files that can be fed into satori.
"""

from __future__ import annotations

import argparse
import os
import re
from pathlib import Path

from fontTools.ttLib import TTCollection


def safe_name(s: str) -> str:
    s = re.sub(r"\s+", "-", s.strip())
    s = re.sub(r"[^A-Za-z0-9._-]+", "_", s)
    return s


def get_name(tt, name_id: int) -> str | None:
    # Prefer Windows Unicode English, then any Unicode.
    name_table = tt["name"].names
    preferred = [(3, 1, 0x0409), (3, 10, 0x0409), (0, 3, 0)]
    for platformID, platEncID, langID in preferred:
        for n in name_table:
            if n.nameID == name_id and n.platformID == platformID and n.platEncID == platEncID and n.langID == langID:
                try:
                    return str(n)
                except Exception:
                    return n.toUnicode()
    # Fallback: first matching nameID
    for n in name_table:
        if n.nameID == name_id:
            try:
                return str(n)
            except Exception:
                return n.toUnicode()
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ttc", required=True, help="Path to .ttc file")
    ap.add_argument("--out-dir", required=True, help="Output directory")
    ap.add_argument("--match", default=None, help="Substring to match font family/full name (e.g. 'PingFang SC')")
    ap.add_argument("--styles", nargs="*", default=[], help="Style names to keep (e.g. Regular Semibold). If empty, keep all matched")
    args = ap.parse_args()

    ttc_path = Path(args.ttc).expanduser()
    out_dir = Path(args.out_dir).expanduser()
    out_dir.mkdir(parents=True, exist_ok=True)

    styles = [s.lower() for s in (args.styles or [])]
    match = args.match.lower() if args.match else None

    coll = TTCollection(str(ttc_path))

    written = 0
    for i, tt in enumerate(coll.fonts):
        family = get_name(tt, 1) or "UnknownFamily"
        subfamily = get_name(tt, 2) or "Regular"
        full = get_name(tt, 4) or f"{family} {subfamily}"

        hay = f"{family} {subfamily} {full}".lower()
        if match and match not in hay:
            continue
        if styles and subfamily.lower() not in styles:
            continue

        filename = f"{safe_name(family)}-{safe_name(subfamily)}.ttf"
        out_path = out_dir / filename
        # Ensure sfntVersion is suitable; save as TTF
        tt.save(str(out_path))
        print(f"WROTE {out_path}  (full='{full}')")
        written += 1

    if written == 0:
        raise SystemExit("No fonts matched; try adjusting --match or omit --styles")


if __name__ == "__main__":
    main()
