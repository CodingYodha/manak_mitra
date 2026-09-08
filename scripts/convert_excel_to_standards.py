#!/usr/bin/env python3
"""
Convert official BIS Published Standards List Excel export into data/curated/standards.csv.
Merges known metadata (ICS codes, Hindi search hints) from standards_seed.csv.
"""
import openpyxl
import csv
import re
import pathlib
import sys
from datetime import datetime

EXCEL_PATH = pathlib.Path("File_Published_Standards_List_2026-09-09_010948.xlsx")
SEED_PATH = pathlib.Path("data/curated/standards_seed.csv")
OUTPUT_PATH = pathlib.Path("data/curated/standards.csv")

def load_seed_overrides():
    overrides = {}
    if SEED_PATH.exists():
        with open(SEED_PATH, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                is_num = row.get("is_number", "").strip()
                if is_num:
                    overrides[is_num] = row
    return overrides

def parse_date_for_year(date_str):
    if not date_str:
        return 0
    match = re.search(r'\b(19\d\d|20\d\d)\b', str(date_str))
    if match:
        return int(match.group(1))
    return 0

def clean_base_is_number(raw_num):
    raw_num = raw_num.strip()
    # Normalize multiple whitespace
    raw_num = re.sub(r'\s+', ' ', raw_num)
    # Check if ends with :YYYY or :YYYY(R-YYYY)
    if ':' in raw_num:
        parts = raw_num.rsplit(':', 1)
        base = parts[0].strip()
        yr_part = parts[1].strip()
        yr_match = re.search(r'\b(19\d\d|20\d\d)\b', yr_part)
        year = int(yr_match.group(1)) if yr_match else 0
        return base, year
    return raw_num, 0

def main():
    if not EXCEL_PATH.exists():
        print(f"ERROR: {EXCEL_PATH} not found", file=sys.stderr)
        sys.exit(1)

    print(f"Reading {EXCEL_PATH}...")
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True)
    ws = wb['Published Standards']

    overrides = load_seed_overrides()
    print(f"Loaded {len(overrides)} seed overrides.")

    records = {}

    for i, row in enumerate(ws.iter_rows(min_row=3, values_only=True), 3):
        raw_num = str(row[1]).strip() if row[1] else ''
        if not raw_num:
            continue
        date_str = str(row[2]).strip() if row[2] else ''
        title = str(row[3]).strip() if row[3] else ''
        std_type = str(row[4]).strip() if row[4] else ''

        base_num, yr_from_num = clean_base_is_number(raw_num)
        yr_from_date = parse_date_for_year(date_str)
        year = yr_from_num or yr_from_date or ''

        # Determine if this row is newer than previously seen for the same base standard
        current_rec = {
            'is_number': base_num,
            'title': title,
            'year': year,
            'date': date_str,
            'std_type': std_type,
            'year_int': int(year) if str(year).isdigit() else 0
        }

        if base_num in records:
            prev = records[base_num]
            # Keep the newer revision
            if current_rec['year_int'] > prev['year_int']:
                records[base_num] = current_rec
        else:
            records[base_num] = current_rec

    print(f"Total unique standards extracted: {len(records)}")

    # Prepare output rows
    output_rows = []
    for base_num, rec in records.items():
        title = rec['title']
        ics_code = ''
        status = 'ACTIVE'
        year = str(rec['year'])
        is_free = 'false'
        purchase_url = f"https://standardsbis.in/StandardsDetail.aspx?pid={base_num.replace(' ', '')}"

        # Apply seed override if available (adds ICS codes and Hindi hints)
        if base_num in overrides:
            ov = overrides[base_num]
            ics_code = ov.get('ics_code', '') or ics_code
            if ov.get('title'):
                # Append Hindi hint if present in seed but not in Excel title
                seed_title = ov['title']
                if '—' in seed_title or '-' in seed_title:
                    for hint in ['एलईडी', 'खिलौनों', 'सोने', 'बल्ब']:
                        if hint in seed_title and hint not in title:
                            title += f" - {seed_title.split('-')[-1].strip()}"
            if ov.get('purchase_url'):
                purchase_url = ov['purchase_url']

        output_rows.append({
            'is_number': base_num,
            'title': title,
            'ics_code': ics_code,
            'status': status,
            'year': year,
            'is_free': is_free,
            'purchase_url': purchase_url
        })

    # Sort deterministically
    output_rows.sort(key=lambda x: x['is_number'])

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['is_number', 'title', 'ics_code', 'status', 'year', 'is_free', 'purchase_url']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(output_rows)

    print(f"Successfully written {len(output_rows)} rows to {OUTPUT_PATH}")

if __name__ == '__main__':
    main()
