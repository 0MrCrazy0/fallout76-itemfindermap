#!/usr/bin/env python3
"""
Combine Community Markers - ROBUST VERSION
- Deduplicates properly using 'id' (primary) and 'cid' (secondary)
- New markers always added at the bottom
- Prevents any duplication against existing community map
- Better logging and error handling
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
    print("Starting community markers combiner (robust deduplication)...")

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
            print(f"Warning: Could not load existing {OUTPUT_FILE}: {e}")

    current_locations = base_data.get("locations", [])

    # Build lookup sets for fast deduplication
    existing_ids = {loc.get("id") for loc in current_locations if loc.get("id")}
    existing_cids = {loc.get("cid") for loc in current_locations if loc.get("cid")}

    new_markers = []
    added_count = 0
    duplicate_count = 0

    for json_file in COMMUNITY_MARKERS_DIR.glob("*.json"):
        data = load_json_file(json_file)
        if not data or not isinstance(data, dict):
            continue

        marker_id = data.get("id")
        cid = data.get("cid")

        if marker_id == SENTINEL_ID:
            print(f"Found sentinel: {json_file.name} → skipped")
            continue

        # Check for duplicates against the current map
        is_duplicate = False
        if marker_id and marker_id in existing_ids:
            is_duplicate = True
        elif cid and cid in existing_cids:
            is_duplicate = True

        if is_duplicate:
            print(f"⚠️ Duplicate skipped: {json_file.name} (id={marker_id}, cid={cid})")
            duplicate_count += 1
            json_file.unlink()  # remove duplicate file
            continue

        # Add as new marker
        new_markers.append(data)
        added_count += 1

        if marker_id:
            existing_ids.add(marker_id)
        if cid:
            existing_cids.add(cid)

    # Combine: existing markers first + new markers at the bottom
    updated_locations = current_locations + new_markers

    # Version bump
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

        # Clean up the community-markers folder
        for json_file in COMMUNITY_MARKERS_DIR.glob("*.json"):
            json_file.unlink()

        print(f"\n✅ Success! Updated {OUTPUT_FILE}")
        print(f"New communityVersion: {new_version}")
        print(f"Added {added_count} new marker(s)")
        print(f"Skipped {duplicate_count} duplicate(s)")
        print(f"Total markers now: {len(updated_locations)}")

    except Exception as e:
        print(f"Error writing {OUTPUT_FILE}: {e}")

if __name__ == "__main__":
    main()
