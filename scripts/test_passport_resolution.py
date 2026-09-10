"""Regression checks for evidence-gated passport input resolution."""

import unittest

from api import answers


class PassportResolutionTest(unittest.TestCase):
    def test_random_input_abstains_without_candidates(self):
        result = answers.passport("random nonsense xyzqplm")
        self.assertEqual(result["status"], "no_verified_match")
        self.assertTrue(result["search_diagnostics"]["decision_withheld"])
        self.assertEqual(result["suggestions"], [])

    def test_base_standard_resolves_to_catalogued_part(self):
        result = answers.passport("IS 16102")
        self.assertEqual(result["status"], "verified")
        self.assertEqual(result["matched_standard"], "IS 16102 (Part 1)")

    def test_typo_only_suggests_and_does_not_issue_verdict(self):
        result = answers.passport("led bulp")
        self.assertEqual(result["status"], "no_verified_match")
        self.assertGreater(len(result["suggestions"]), 0)


if __name__ == "__main__":
    unittest.main()
