#!/usr/bin/env python3
"""
Combine Community Markers
Runs after a community-submission PR is merged.
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

    all_markers = []
    existing_cids = set()

    for json_file in COMMUNITY_MARKERS_DIR.glob("*.json"):
        data = load_json_file(json_file)
        if not data or not isinstance(data, dict):
            continue

        cid = data.get("cid")
        if cid:
            if cid in existing_cids:
                print(f"⚠️  Skipping duplicate cid: {cid} ({json_file.name})")
                json_file.unlink()
                continue
            existing_cids.add(cid)

        # Skip the sentinel — it is never added to the final map
        if data.get("id") == SENTINEL_ID:
            print(f"Found sentinel: {json_file.name} (skipped in final output)")
            continue

        all_markers.append(data)

    # Load or initialise version
    current_version = 3.1
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                old_data = json.load(f)
                current_version = float(old_data.get("communityVersion", 3.1))
        except:
            pass

    new_version = round(current_version + 0.1, 1)
    last_updated = datetime.utcnow().isoformat() + "Z"

    output_data = {
        "communityVersion": new_version,
        "lastUpdated": last_updated,
        "locations": all_markers   # ← Sentinel is now completely excluded
    }

    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)

        # Clean up all marker files
        for json_file in COMMUNITY_MARKERS_DIR.glob("*.json"):
            json_file.unlink()

        print(f"\nSuccess! Updated {OUTPUT_FILE}")
        print(f"New communityVersion: {new_version}")
        print(f"Total markers: {len(all_markers)}")

    except Exception as e:
        print(f"Error writing {OUTPUT_FILE}: {e}")

if __name__ == "__main__":
    main()
