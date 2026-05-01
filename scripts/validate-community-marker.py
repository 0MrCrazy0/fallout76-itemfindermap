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
    """Load all existing marker IDs from communitymap.json for duplicate prevention."""
    if not COMMUNITYMAP_PATH.exists():
        return set()
    with open(COMMUNITYMAP_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return {loc.get("id") for loc in data.get("locations", []) if loc.get("id")}


def load_existing_cids():
    """Load all existing marker CIDs from communitymap.json (new stronger duplicate check)."""
    if not COMMUNITYMAP_PATH.exists():
        return set()
    with open(COMMUNITYMAP_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return {loc.get("cid") for loc in data.get("locations", []) if loc.get("cid")}


def validate_marker(file_path):
    try:
        with open(file_path, encoding="utf-8") as f:
            marker = json.load(f)
        
        # Schema validation
        validate(instance=marker, schema=load_schema())
        
        # ── Duplicate check (both id and cid) ──
        existing_ids = load_existing_ids()
        existing_cids = load_existing_cids()

        if marker["id"] in existing_ids:
            return False, "Duplicate ID detected"
        
        if marker.get("cid") in existing_cids:
            return False, "Duplicate CID detected"

        # Coordinate bounds check
        if not (0 <= marker["lat"] <= 4096 and 0 <= marker["lng"] <= 4096):
            return False, "Coordinates outside Fallout 76 map bounds"
        
        # Improved description check
        desc = str(marker.get("desc", "")).strip()
        if len(desc) < 15:
            return False, "Description too short (minimum 15 characters)"
        
        # Detect pure auto-generated fallback from Worker
        if "Grid" in desc and "Submitted By" in desc and len(desc) < 50:
            return False, "No real description added by user (only auto-generated fallback)"
        
        return True, "Valid marker"
    
    except ValidationError as e:
        if "desc" in str(e.message).lower():
            return False, "Description too short or missing (minimum 15 characters)"
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
