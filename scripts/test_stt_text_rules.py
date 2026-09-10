"""Regression checks for conservative BIS speech terminology cleanup."""

import unittest

from api.main import _normalize_stt_domain_text


class SttTextRulesTest(unittest.TestCase):
    def test_hindi_domain_spellings_are_normalized(self):
        raw = "9 वात LED बल्ग के लिए BIS प्रमानन अनिवारे है क्या?"
        self.assertEqual(
            _normalize_stt_domain_text(raw),
            "9 वाट LED बल्ब के लिए BIS प्रमाणन अनिवार्य है क्या?",
        )

    def test_unrelated_content_is_unchanged(self):
        value = "Find a testing laboratory in Delhi"
        self.assertEqual(_normalize_stt_domain_text(value), value)


if __name__ == "__main__":
    unittest.main()
