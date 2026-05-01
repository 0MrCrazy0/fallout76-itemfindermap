import json
import sys
from pathlib import Path
from jsonschema import validate, ValidationError

SCHEMA_PATH = Path(".github/schemas/community-marker-schema.json")
COMMUNITYMAP_PATH = Path("communitymap.json")

def load_schema():
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        return json.load(f)

def load_existing_ids():
    if not COMMUNITYMAP_PATH.exists():
        return set()
    with open(COMMUNITYMAP_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return {loc.get("id") for loc in data.get("locations", []) if loc.get("id")}

def load_existing_cids():
    if not COMMUNITYMAP_PATH.exists():
        return set()
    with open(COMMUNITYMAP_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return {loc.get("cid") for loc in data.get("locations", []) if loc.get("cid")}

def validate_marker(file_path):
    try:
        with open(file_path, encoding="utf-8") as f:
            marker = json.load(f)

        validate(instance=marker, schema=load_schema())

        existing_ids = load_existing_ids()
        existing_cids = load_existing_cids()

        if marker.get("id") in existing_ids:
            return False, "Duplicate ID detected"
        if marker.get("cid") in existing_cids:
            return False, "Duplicate CID detected"

        if not (0 <= marker.get("lat", 0) <= 4096 and 0 <= marker.get("lng", 0) <= 4096):
            return False, "Coordinates outside map bounds"

        desc = str(marker.get("desc", "")).strip()
        if len(desc) < 15:
            return False, "Description too short (minimum 15 characters)"

        return True, "Valid marker"

    except ValidationError as e:
        return False, f"Schema error: {e.message}"
    except Exception as e:
        return False, f"Invalid JSON or other error: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python validate-community-marker.py <marker.json>")
        sys.exit(1)

    file_path = Path(sys.argv[1])
    valid, message = validate_marker(file_path)
    print(f"VALID:{valid}")
    print(f"MESSAGE:{message}")
    print(f"FILE:{file_path.name}")
