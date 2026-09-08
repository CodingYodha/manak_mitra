#!/usr/bin/env python3
"""
Validate data/curated/standards.csv before embedding.

Usage:
    python scripts/verify_standards.py
    python scripts/verify_standards.py data/curated/standards_seed.csv   # test on seed

Checks:
  - Required columns present
  - is_number not empty
  - title not empty
  - status is one of: ACTIVE, SUPERSEDED, WITHDRAWN
  - year is numeric (if present)
  - is_free is 0/1/true/false (if present)
  - No duplicate IS numbers

Exits 0 on success, 1 on any error.
"""
import csv, sys, pathlib, collections

VALID_STATUSES = {"ACTIVE", "SUPERSEDED", "WITHDRAWN", ""}
VALID_FREE = {"0", "1", "true", "false", "yes", "no", ""}
REQUIRED_COLS = {"is_number", "title", "ics_code", "status", "year", "is_free", "purchase_url"}

def validate(csv_path: str) -> list[str]:
    path = pathlib.Path(csv_path)
    if not path.exists():
        return [f"File not found: {path}"]

    errors = []
    seen_is = collections.Counter()

    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        
        if reader.fieldnames is None:
            return ["CSV appears empty or has no header"]

        # Check columns
        actual = {c.strip().lower() for c in reader.fieldnames}
        required_lower = {c.lower() for c in REQUIRED_COLS}
        missing_cols = required_lower - actual
        if missing_cols:
            errors.append(f"Missing columns: {missing_cols}")

        for i, row in enumerate(reader, 2):
            is_num = row.get("is_number", "").strip()
            title  = row.get("title", "").strip()
            status = row.get("status", "").strip().upper()
            year   = row.get("year", "").strip()
            is_free = row.get("is_free", "").strip().lower()

            if not is_num:
                errors.append(f"Row {i}: empty is_number")
                continue   # can't check duplicates without a key

            seen_is[is_num] += 1

            if not title:
                errors.append(f"Row {i} ({is_num}): empty title")

            if status not in VALID_STATUSES:
                errors.append(f"Row {i} ({is_num}): invalid status '{status}' — must be ACTIVE | SUPERSEDED | WITHDRAWN")

            if year and not year.isdigit():
                errors.append(f"Row {i} ({is_num}): year '{year}' is not numeric")

            if is_free not in VALID_FREE:
                errors.append(f"Row {i} ({is_num}): is_free '{is_free}' — must be true/false/0/1")

    # Duplicate IS numbers
    for is_num, count in seen_is.items():
        if count > 1:
            errors.append(f"Duplicate IS number: {is_num} appears {count} times")

    return errors


def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else "data/curated/standards.csv"
    print(f"Validating: {csv_path}")
    
    errors = validate(csv_path)
    
    if errors:
        print(f"\nFOUND {len(errors)} ERROR(S):")
        for e in errors:
            print(f"  ERROR: {e}")
        sys.exit(1)
    else:
        # Count rows
        with open(csv_path, encoding="utf-8-sig") as f:
            row_count = sum(1 for _ in csv.DictReader(f))
        print(f"OK — {row_count} standards, no errors found")
        if row_count < 300:
            print(f"WARNING: only {row_count} rows — target is ≥300 before demo freeze")


if __name__ == "__main__":
    main()
