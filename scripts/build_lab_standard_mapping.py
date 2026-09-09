import csv
import re
import time
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


# ============================================================
# CONFIG
# ============================================================

INPUT_LABS = Path("data/labs.csv")
OUTPUT_FILE = Path("data/curated/lab_standard_mapping.csv")

BIS_LABS_URL = "https://lims.bis.gov.in/home/labs/"

REQUEST_DELAY = 0.5

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 "
        "(KHTML, like Gecko) "
        "Chrome/131.0 Safari/537.36"
    )
}


# ============================================================
# HTTP SESSION
# ============================================================

session = requests.Session()
session.headers.update(HEADERS)


# ============================================================
# HELPERS
# ============================================================

def clean(value):
    if value is None:
        return ""

    value = str(value)
    value = re.sub(r"\s+", " ", value)

    return value.strip()


def normalize_name(name):
    """
    Used for matching labs.csv names against BIS LIMS names.
    """

    name = clean(name).lower()

    # Remove common punctuation
    name = re.sub(r"[^a-z0-9]+", " ", name)

    # Remove common legal suffixes
    suffixes = [
        "private limited",
        "pvt ltd",
        "pvt limited",
        "limited",
        "llp",
        "opc",
        "company",
        "co",
    ]

    for suffix in suffixes:
        name = name.replace(suffix, " ")

    # Normalize cities appearing in lab names
    replacements = {
        "bangalore": "bengaluru",
        "bombay": "mumbai",
        "madras": "chennai",
        "gurgaon": "gurugram",
        "calcutta": "kolkata",
    }

    for old, new in replacements.items():
        name = name.replace(old, new)

    return re.sub(r"\s+", " ", name).strip()


def normalize_city(city):
    city = clean(city)

    replacements = {
        "Bangalore": "Bengaluru",
        "Bangalore Urban": "Bengaluru",
        "Bombay": "Mumbai",
        "Madras": "Chennai",
        "Calcutta": "Kolkata",
        "Gurgaon": "Gurugram",
        "Gurugram": "Gurugram",
    }

    return replacements.get(city, city)


def split_categories(value):
    """
    Split:

        electronics, electrical

        electronics; electrical

        electronics / electrical
    """

    value = clean(value)

    if not value:
        return []

    parts = re.split(r"[,;|/]+", value)

    return [
        clean(x)
        for x in parts
        if clean(x)
    ]


# ============================================================
# LOAD labs.csv
# ============================================================

def load_input_labs():

    if not INPUT_LABS.exists():
        raise FileNotFoundError(
            f"Could not find {INPUT_LABS}\n"
            f"Put your labs.csv at that location."
        )

    labs = []

    with open(
        INPUT_LABS,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as f:

        reader = csv.DictReader(f)

        if not reader.fieldnames:
            raise ValueError("labs.csv has no header.")

        # Flexible column detection
        columns = {
            c.lower().strip(): c
            for c in reader.fieldnames
        }

        name_col = (
            columns.get("name")
            or columns.get("lab_name")
            or columns.get("lab name")
        )

        city_col = columns.get("city")
        state_col = columns.get("state")

        category_col = (
            columns.get("categories")
            or columns.get("category")
        )

        if not name_col:
            raise ValueError(
                "labs.csv must contain a 'name' or 'lab_name' column."
            )

        if not city_col:
            raise ValueError(
                "labs.csv must contain a 'city' column."
            )

        if not state_col:
            raise ValueError(
                "labs.csv must contain a 'state' column."
            )

        if not category_col:
            raise ValueError(
                "labs.csv must contain a 'categories' column."
            )

        for row in reader:

            labs.append({
                "lab_name": clean(row.get(name_col)),
                "city": normalize_city(row.get(city_col)),
                "state": clean(row.get(state_col)),
                "categories": clean(row.get(category_col)),
            })

    print(f"Loaded {len(labs)} labs from {INPUT_LABS}")

    return labs


# ============================================================
# SCRAPE BIS LAB LIST
# ============================================================

def scrape_lab_listing_page(page):

    url = BIS_LABS_URL

    if page > 1:
        url += f"?page={page}"

    print(f"Fetching lab listing page {page}: {url}")

    response = session.get(
        url,
        timeout=30
    )

    response.raise_for_status()

    soup = BeautifulSoup(
        response.text,
        "html.parser"
    )

    labs = []

    # Find all links containing "View Scope"
    for link in soup.find_all("a"):

        text = clean(link.get_text(" ", strip=True))

        if "View Scope" not in text:
            continue

        href = link.get("href")

        if not href:
            continue

        scope_url = urljoin(
            BIS_LABS_URL,
            href
        )

        # Walk up to the table row
        row = link.find_parent("tr")

        if not row:
            continue

        cells = row.find_all("td")

        if len(cells) < 8:
            continue

        values = [
            clean(cell.get_text(" ", strip=True))
            for cell in cells
        ]

        # Expected:
        #
        # 0 S.No.
        # 1 Lab Code
        # 2 Lab Name
        # 3 Address
        # 4 Contact
        # 5 Phone
        # 6 Email
        # 7 Validity
        # 8 View Scope

        lab_code = values[1]
        lab_name = values[2]
        address = values[3]
        validity = values[7]

        labs.append({
            "lab_code": lab_code,
            "lab_name": lab_name,
            "address": address,
            "validity": validity,
            "scope_url": scope_url,
        })

    return labs


def scrape_all_bis_labs():

    all_labs = []

    # BIS currently shows 431 recognized labs.
    # 20 per page => ~22 pages.
    #
    # We don't hard-code 22. We stop when a page
    # produces no labs.

    page = 1

    while True:

        try:
            labs = scrape_lab_listing_page(page)

        except Exception as e:

            print(
                f"ERROR scraping page {page}: {e}"
            )

            break

        if not labs:
            break

        print(
            f"  Found {len(labs)} labs"
        )

        all_labs.extend(labs)

        page += 1

        time.sleep(REQUEST_DELAY)

    # Remove duplicates
    unique = {}

    for lab in all_labs:

        key = (
            lab["lab_code"],
            normalize_name(lab["lab_name"])
        )

        unique[key] = lab

    result = list(unique.values())

    print(
        f"\nTotal BIS labs discovered: {len(result)}"
    )

    return result


# ============================================================
# MATCH labs.csv TO BIS LIMS
# ============================================================

def match_lab(user_lab, bis_labs):

    user_name = normalize_name(
        user_lab["lab_name"]
    )

    user_city = normalize_name(
        user_lab["city"]
    )

    # --------------------------------------------------------
    # First: exact normalized name
    # --------------------------------------------------------

    for lab in bis_labs:

        bis_name = normalize_name(
            lab["lab_name"]
        )

        if user_name == bis_name:
            return lab

    # --------------------------------------------------------
    # Second: name contains
    # --------------------------------------------------------

    candidates = []

    for lab in bis_labs:

        bis_name = normalize_name(
            lab["lab_name"]
        )

        if user_name in bis_name:
            candidates.append(lab)

        elif bis_name in user_name:
            candidates.append(lab)

    # Prefer same city
    for lab in candidates:

        address = normalize_name(
            lab["address"]
        )

        if user_city and user_city in address:
            return lab

    if candidates:
        return candidates[0]

    return None


# ============================================================
# EXTRACT SCOPE
# ============================================================

def extract_scope(scope_url):

    print(
        f"    Scope: {scope_url}"
    )

    response = session.get(
        scope_url,
        timeout=30
    )

    response.raise_for_status()

    soup = BeautifulSoup(
        response.text,
        "html.parser"
    )

    rows = []

    # Find table rows
    for tr in soup.find_all("tr"):

        cells = tr.find_all("td")

        if len(cells) < 4:
            continue

        values = [
            clean(
                cell.get_text(
                    " ",
                    strip=True
                )
            )
            for cell in cells
        ]

        # Skip header rows
        joined = " ".join(values).lower()

        if "indian standard" in joined:
            continue

        # We need at least:
        #
        # S.No.
        # IS Number
        # Product
        # Grade/Type/Size
        #
        if len(values) < 4:
            continue

        serial = values[0]
        is_number = values[1]
        product = values[2]
        grade = values[3]

        # Basic validation:
        #
        # IS 16415 (2015)
        # IS 302 (Part 1)
        # IS 12330
        #
        if not re.search(
            r"\bIS(?:/IEC)?\s*[\w\-]+",
            is_number,
            re.IGNORECASE
        ):
            continue

        validity = ""
        remark = ""

        if len(values) >= 6:
            validity = values[5]

        if len(values) >= 7:
            remark = values[6]

        rows.append({
            "is_number": is_number,
            "product_name": product,
            "grade_type_size": grade,
            "scope_validity": validity,
            "scope_remark": remark,
            "source_url": scope_url,
        })

    return rows


# ============================================================
# MERGE
# ============================================================

def build_final_dataset(input_labs, bis_labs):

    output = []

    unmatched = []

    scope_cache = {}

    for index, user_lab in enumerate(
        input_labs,
        start=1
    ):

        print(
            f"\n[{index}/{len(input_labs)}] "
            f"{user_lab['lab_name']}"
        )

        matched = match_lab(
            user_lab,
            bis_labs
        )

        if not matched:

            print(
                "    !! No BIS LIMS match found"
            )

            unmatched.append(
                user_lab["lab_name"]
            )

            # Still preserve the lab/category information
            categories = split_categories(
                user_lab["categories"]
            )

            if not categories:
                categories = [""]

            for category in categories:

                output.append({
                    "lab_name": user_lab["lab_name"],
                    "city": user_lab["city"],
                    "state": user_lab["state"],
                    "category": category,
                    "lab_code": "",
                    "is_number": "",
                    "product_name": "",
                    "grade_type_size": "",
                    "scope_validity": "",
                    "scope_remark": "",
                    "ics_code": "",
                    "ics_cluster": "",
                    "source_url": "",
                    "mapping_status": "lab_not_found_in_bis",
                })

            continue

        print(
            f"    Matched: {matched['lab_name']}"
        )

        print(
            f"    Lab Code: {matched['lab_code']}"
        )

        scope_url = matched["scope_url"]

        # Don't request same scope twice
        if scope_url not in scope_cache:

            try:

                scope_cache[scope_url] = extract_scope(
                    scope_url
                )

            except Exception as e:

                print(
                    f"    !! Scope extraction failed: {e}"
                )

                scope_cache[scope_url] = []

            time.sleep(REQUEST_DELAY)

        scope_rows = scope_cache[
            scope_url
        ]

        categories = split_categories(
            user_lab["categories"]
        )

        # ----------------------------------------------------
        # If scope exists, create one row per IS standard
        # ----------------------------------------------------

        if scope_rows:

            for scope in scope_rows:

                output.append({
                    "lab_name": user_lab["lab_name"],
                    "city": user_lab["city"],
                    "state": user_lab["state"],
                    "category": "; ".join(categories),
                    "lab_code": matched["lab_code"],
                    "is_number": scope["is_number"],
                    "product_name": scope["product_name"],
                    "grade_type_size": scope["grade_type_size"],
                    "scope_validity": scope["scope_validity"],
                    "scope_remark": scope["scope_remark"],
                    "ics_code": "",
                    "ics_cluster": "",
                    "source_url": scope["source_url"],
                    "mapping_status": "verified_bis_lims_scope",
                })

        # ----------------------------------------------------
        # Scope page exists but nothing parsed
        # ----------------------------------------------------

        else:

            output.append({
                "lab_name": user_lab["lab_name"],
                "city": user_lab["city"],
                "state": user_lab["state"],
                "category": "; ".join(categories),
                "lab_code": matched["lab_code"],
                "is_number": "",
                "product_name": "",
                "grade_type_size": "",
                "scope_validity": "",
                "scope_remark": "",
                "ics_code": "",
                "ics_cluster": "",
                "source_url": scope_url,
                "mapping_status": "scope_found_but_not_parsed",
            })

    return output, unmatched


# ============================================================
# SAVE CSV
# ============================================================

def save_csv(rows):

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    fields = [
        "lab_name",
        "city",
        "state",
        "category",
        "lab_code",
        "is_number",
        "product_name",
        "grade_type_size",
        "scope_validity",
        "scope_remark",
        "ics_code",
        "ics_cluster",
        "source_url",
        "mapping_status",
    ]

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
        newline=""
    ) as f:

        writer = csv.DictWriter(
            f,
            fieldnames=fields
        )

        writer.writeheader()

        writer.writerows(rows)

    print(
        f"\nSaved {len(rows)} rows to:"
    )

    print(
        f"  {OUTPUT_FILE}"
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 70)
    print("BIS LAB → STANDARD MAPPING BUILDER")
    print("=" * 70)

    input_labs = load_input_labs()

    print("\nStep 1: Scraping BIS recognized laboratories...")

    bis_labs = scrape_all_bis_labs()

    if not bis_labs:

        raise RuntimeError(
            "No BIS laboratories were discovered."
        )

    print(
        "\nStep 2: Matching your labs.csv "
        "against BIS LIMS..."
    )

    final_rows, unmatched = build_final_dataset(
        input_labs,
        bis_labs
    )

    print(
        "\nStep 3: Saving final dataset..."
    )

    save_csv(final_rows)

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)

    print(
        f"Input labs:       {len(input_labs)}"
    )

    print(
        f"BIS labs scraped: {len(bis_labs)}"
    )

    print(
        f"Output rows:      {len(final_rows)}"
    )

    print(
        f"Unmatched labs:   {len(unmatched)}"
    )

    if unmatched:

        print("\nUnmatched labs:")

        for name in unmatched:
            print(
                f"  - {name}"
            )

    print("\nDone.")


if __name__ == "__main__":
    main()