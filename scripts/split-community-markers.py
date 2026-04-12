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
    sentinel_marker = None
    existing_cids = set()

    for json_file in COMMUNITY_MARKERS_DIR.glob("*.json"):
        data = load_json_file(json_file)
        if not data or not isinstance(data, dict):
            continue

        cid = data.get("cid")
        if cid:
            if cid in existing_cids:
                print(f"⚠️  Skipping duplicate cid: {cid} ({json_file.name})")
                json_file.unlink()  # clean up
                continue
            existing_cids.add(cid)

        if data.get("id") == SENTINEL_ID:
            sentinel_marker = data
            print(f"Found sentinel: {json_file.name}")
        else:
            all_markers.append(data)

    if not sentinel_marker:
        print("Warning: Sentinel not found. Using default.")
        sentinel_marker = {
            "id": SENTINEL_ID,
            "cid": "sentinel-do-not-remove",
            "category": "misc",
            "desc": "=== SENTINEL - DO NOT REMOVE OR EDIT ===\nAll new markers must be added ABOVE this object",
            "lat": 0,
            "lng": 0,
            "icon": "📍",
            "addedTime": 0,
            "locked": True,
            "isPostcard": False,
            "isTemp": False,
            "startTime": None,
            "keepBtnBound": False,
            "userEdited": False,
            "wasCommunityKept": False,
            "isCommunity": True
        }

    final_locations = all_markers + [sentinel_marker]

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
        "locations": final_locations
    }

    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)

        # Clean up all non-sentinel marker files
        for json_file in COMMUNITY_MARKERS_DIR.glob("*.json"):
            if json_file.name != "sentinel.json":  # safety
                json_file.unlink()

        print(f"\nSuccess! Updated {OUTPUT_FILE}")
        print(f"New communityVersion: {new_version}")
        print(f"Total markers: {len(final_locations)} (including sentinel)")
        print(f"Processed and removed {len(all_markers)} community marker file(s).")

    except Exception as e:
        print(f"Error writing {OUTPUT_FILE}: {e}")

if __name__ == "__main__":
    main()
