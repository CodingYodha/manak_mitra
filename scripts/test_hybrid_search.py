import sys, re
sys.path.insert(0, 'api')
import search
import numpy as np

# Let us test hybrid scoring on the search engine
HINDI_MAP = {
    'एलईडी': 'LED',
    'बल्ब': 'bulb',
    'खिलौने': 'toys',
    'खिलौनों': 'toys',
    'सीमेंट': 'cement',
    'सोने': 'gold',
    'सोना': 'gold',
    'पानी': 'water',
    'गीजर': 'water heater'
}

def hybrid_find(query, k=5, ics_prefix=None):
    # Expand Hindi terms
    expanded_q = query
    for h_word, eng in HINDI_MAP.items():
        if h_word in expanded_q and eng not in expanded_q:
            expanded_q += f" {eng}"

    # Dense vector retrieval
    q_vec = search._MODEL.encode([expanded_q], normalize_embeddings=True)[0]
    dense_scores = search._VECS @ q_vec

    # Tokenize query for lexical boost
    q_tokens = set(re.findall(r'[a-zA-Z0-9]+', expanded_q.lower()))
    # Filter stopwords
    stopwords = {'what', 'is', 'for', 'in', 'of', 'and', 'the', 'standard', 'specification', 'number', 'india', 'applies', 'need', 'do', 'part'}
    key_tokens = {t for t in q_tokens if t not in stopwords and len(t) >= 3}

    combined_scores = []
    for idx in range(len(dense_scores)):
        m = search._META[idx]
        if ics_prefix and not (m.get("ics_code") or "").startswith(ics_prefix):
            combined_scores.append(-1.0)
            continue

        score = float(dense_scores[idx])

        # Lexical match boost
        title_lower = (m['title'] + " " + m['is_number']).lower()
        matches = sum(1 for t in key_tokens if t in title_lower)
        if matches > 0:
            score += 0.15 * matches  # boost for matching salient keywords

        combined_scores.append(score)

    combined_scores = np.array(combined_scores)
    top_indices = np.argsort(-combined_scores)[:k]

    results = []
    for idx in top_indices:
        if combined_scores[idx] < 0: continue
        results.append({**search._META[idx], "score": float(combined_scores[idx]), "dense_score": float(dense_scores[idx])})

    return results

test_queries = [
    "Do I need BIS certification for a 9W LED bulb?",
    "एलईडी बल्ब के लिए कौन सा IS नंबर है?",
    "बच्चों के खिलौनों के लिए BIS मानक",
    "Standard for children plastic toys safety in India",
    "What standard applies to electric water heaters?",
    "Portland cement specification IS number",
    "PVC insulated cables for buildings IS number",
    "packaged drinking water quality standard",
    "What is the airspeed velocity of an unladen swallow?",
    "Tell me a joke about certification"
]

for q in test_queries:
    hits = hybrid_find(q, k=3)
    print("=" * 60)
    print("Q:", q)
    for h in hits:
        print(f"  [{h['score']:.3f} | dense: {h['dense_score']:.3f}] {h['is_number']:20s} | {h['title'][:55]}")
