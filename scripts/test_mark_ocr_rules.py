"""Regression checks for OCR mark classification without requiring image fixtures."""

import unittest

from api.marks import _is_ocr_huid_candidate, detect_mark_type, verify_huid, verify_mark


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

    def test_each_manual_pipeline_has_its_own_grammar(self):
        self.assertEqual(verify_mark("A1B2C3", "huid")["status"], "structurally_plausible")
        self.assertEqual(verify_mark("A1B2C3", "isi")["status"], "invalid")
        self.assertEqual(verify_mark("CM/L-1234567", "isi")["code"], "CM/L-1234567")
        self.assertEqual(verify_mark("CM/L-1234567", "crs")["status"], "invalid")
        self.assertEqual(verify_mark("R-41001234", "crs")["code"], "R-41001234")


if __name__ == "__main__":
    unittest.main()
