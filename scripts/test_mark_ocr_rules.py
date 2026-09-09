"""Regression checks for OCR mark classification without requiring image fixtures."""

import unittest

from api.marks import _is_ocr_huid_candidate, detect_mark_type, verify_huid


class MarkOcrRulesTest(unittest.TestCase):
    def test_purity_stamp_is_not_a_huid(self):
        self.assertEqual(detect_mark_type("22K916"), "unknown")
        result = verify_huid("22K916")
        self.assertEqual(result["status"], "invalid")
        self.assertTrue(result["evidence"]["purity_mark"])

    def test_ocr_rejects_words_and_accepts_mixed_identifier(self):
        self.assertFalse(_is_ocr_huid_candidate("ASSEYI"))
        self.assertFalse(_is_ocr_huid_candidate("22K916"))
        self.assertTrue(_is_ocr_huid_candidate("A1B2C3"))


if __name__ == "__main__":
    unittest.main()
