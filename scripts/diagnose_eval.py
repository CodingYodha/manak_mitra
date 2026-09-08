import sys
sys.path.insert(0, 'api')
import search

queries = [
    "एलईडी बल्ब के लिए कौन सा IS नंबर है?",
    "बच्चों के खिलौनों के लिए BIS मानक",
    "Standard for children plastic toys safety in India",
    "What standard applies to electric water heaters?",
    "Portland cement specification IS number",
    "PVC insulated cables for buildings IS number",
    "packaged drinking water quality standard"
]

for q in queries:
    print("=" * 60)
    print("QUERY:", q)
    hits = search.find(q, k=5)
    for h in hits:
        print(f"  [{h['score']:.3f}] {h['is_number']:20s} | {h['title'][:55]}")
