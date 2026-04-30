#!/usr/bin/env python3
"""
Combine Community Markers - PERFECTED VERSION
- Deduplicates using id + cid
- Always adds new markers at the bottom
- Guaranteed cleanup of temporary marker files
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

    # Load existing communitymap.json
    base_data = {}
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                base_data = json.load(f)
        except Exception as e:
            print(f"Warning: Could not load {OUTPUT_FILE}: {e}")

    current_locations = base_data.get("locations", [])

    existing_ids = {loc.get("id") for loc in current_locations if loc.get("id")}
    existing_cids = {loc.get("cid") for loc in current_locations if loc.get("cid")}

    new_markers = []
    added_count = 0
    duplicate_count = 0

    for json_file in list(COMMUNITY_MARKERS_DIR.glob("*.json")):
        data = load_json_file(json_file)
        if not data or not isinstance(data, dict):
            continue

        marker_id = data.get("id")
        cid = data.get("cid")

        if marker_id == SENTINEL_ID:
            print(f"Found sentinel: {json_file.name} → skipped")
            continue

        if (marker_id and marker_id in existing_ids) or (cid and cid in existing_cids):
            print(f"⚠️ Duplicate skipped: {json_file.name}")
            duplicate_count += 1
            json_file.unlink()
            continue

        new_markers.append(data)
        added_count += 1
        if marker_id: existing_ids.add(marker_id)
        if cid: existing_cids.add(cid)

    updated_locations = current_locations + new_markers

    current_version = float(base_data.get("communityVersion", 3.1))
    new_version = round(current_version + 0.1, 1)

    output_data = {
        **base_data,
        "communityVersion": new_version,
        "lastUpdated": datetime.utcnow().isoformat() + "Z",
        "locations": updated_locations
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    # Guaranteed cleanup
    print("Cleaning community-markers/ folder...")
    for json_file in COMMUNITY_MARKERS_DIR.glob("*.json"):
        if json_file.name == "sentinel.json" or json_file.name.endswith((".gitkeep", "gitkeep.txt")):
            continue
        json_file.unlink()
        print(f"Deleted: {json_file.name}")

    print(f"\n✅ SUCCESS! Updated {OUTPUT_FILE}")
    print(f"New version: {new_version}")
    print(f"Added: {added_count} | Duplicates skipped: {duplicate_count}")
    print(f"Total markers: {len(updated_locations)}")

if __name__ == "__main__":
    main()
