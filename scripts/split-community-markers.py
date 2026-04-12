#!/usr/bin/env python3
"""
Combine Community Markers - FINAL VERSION
Preserves full original structure on every merge.
"""

import json
from pathlib import Path
from datetime import datetime

COMMUNITY_MARKERS_DIR = Path("community-markers")
OUTPUT_FILE = Path("communitymap.json")

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
        if cid and cid in existing_cids:
            print(f"⚠️  Skipping duplicate cid: {cid} ({json_file.name})")
            json_file.unlink()
            continue
        if cid:
            existing_cids.add(cid)

        all_markers.append(data)

    # Load existing file to preserve full structure
    base_data = {}
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                base_data = json.load(f)
        except:
            pass

    current_version = float(base_data.get("communityVersion", 3.1))
    new_version = round(current_version + 0.1, 1)

    output_data = {
        **base_data,                    # Keeps "version", "customCategories", etc.
        "communityVersion": new_version,
        "lastUpdated": datetime.utcnow().isoformat() + "Z",
        "locations": all_markers
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
