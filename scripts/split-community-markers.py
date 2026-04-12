#!/usr/bin/env python3
"""
Combine Community Markers - FINAL VERSION
- New markers are ALWAYS added at the BOTTOM
- Sentinel is completely skipped
- Full original structure is preserved
"""

import json
from pathlib import Path
from datetime import datetime

COMMUNITY_MARKERS_DIR = Path("community-markers")
OUTPUT_FILE = Path("communitymap.json")
SENTINEL_ID = "id-sentinel-do-not-remove"

def load_json_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load {file_path}: {e}")
        return None

def main():
    print("Starting community markers combiner...")

    if not COMMUNITY_MARKERS_DIR.exists():
        print(f"Error: Folder '{COMMUNITY_MARKERS_DIR}' not found!")
        return

    new_markers = []
    existing_cids = set()

    for json_file in COMMUNITY_MARKERS_DIR.glob("*.json"):
        data = load_json_file(json_file)
        if not data or not isinstance(data, dict):
            continue

        if data.get("id") == SENTINEL_ID:
            print(f"Found sentinel: {json_file.name} → skipped")
            continue

        cid = data.get("cid")
        if cid:
            if cid in existing_cids:
                print(f"⚠️  Skipping duplicate cid: {cid} ({json_file.name})")
                json_file.unlink()
                continue
            existing_cids.add(cid)

        new_markers.append(data)

    # Load existing file
    base_data = {}
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                base_data = json.load(f)
        except:
            pass

    current_locations = base_data.get("locations", [])
    updated_locations = current_locations + new_markers   # ← Forces new markers to bottom

    current_version = float(base_data.get("communityVersion", 3.1))
    new_version = round(current_version + 0.1, 1)

    output_data = {
        **base_data,
        "communityVersion": new_version,
        "lastUpdated": datetime.utcnow().isoformat() + "Z",
        "locations": updated_locations
    }

    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)

        for json_file in COMMUNITY_MARKERS_DIR.glob("*.json"):
            json_file.unlink()

        print(f"\nSuccess! Updated {OUTPUT_FILE}")
        print(f"New communityVersion: {new_version}")
        print(f"Added {len(new_markers)} new marker(s) at the BOTTOM")
        print(f"Total markers: {len(updated_locations)}")

    except Exception as e:
        print(f"Error writing {OUTPUT_FILE}: {e}")

if __name__ == "__main__":
    main()
