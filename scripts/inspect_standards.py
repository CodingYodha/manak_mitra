import json

meta = json.load(open('vectors_meta.json', encoding='utf-8'))
targets = ['IS 8978', 'IS 368', 'IS 2082', 'IS 269', 'IS 455', 'IS 694', 'IS 1554', 'IS 14543', 'IS 10500']
for m in meta:
    for num in targets:
        if m['is_number'] == num or m['is_number'].startswith(num + ' '):
            print(f"{m['is_number']:20s} : {m['title']}")
