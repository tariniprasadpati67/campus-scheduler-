import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.ai_service import (
    parse_booking_request,
    parse_faculty_change_request,
    explain_decision,
    _regex_fallback_booking_parser,
)
from backend.app.ai_validator import validate_ai_booking_payload


class TestAIService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_parse_booking_english(self):
        text = "Need a room for 45 people on Tuesday 6 to 8 pm, projector please."
        res = parse_booking_request(text, user_role="club")
        struct = res["structured"]
        self.assertEqual(struct["attendance"], 45)
        self.assertEqual(struct["duration_periods"], 2)
        self.assertEqual(struct["windows"][0]["day"], "TUE")
        self.assertEqual(struct["windows"][0]["from_period"], 10)
        self.assertIn("projector", [n.lower() for n in struct["needs"]])

    def test_parse_booking_hinglish(self):
        text = "seminar hall kal shaam 6 baje, 2 ghante, 100 log, mic chahiye"
        res = parse_booking_request(text, user_role="club")
        struct = res["structured"]
        self.assertEqual(struct["attendance"], 100)
        self.assertEqual(struct["duration_periods"], 2)
        self.assertIn("seminar_hall", struct["room_types"])
        self.assertIn("mic", [n.lower() for n in struct["needs"]])

    def test_role_category_cap(self):
        text = "Book the auditorium for the CSE department farewell, Friday evening, around 400 people"
        res = parse_booking_request(text, user_role="club")
        struct = res["structured"]
        # Club role cannot exceed club_event
        self.assertEqual(struct["requested_category"], "club_event")
        self.assertTrue(any("exceeds permissions" in w for w in res["warnings"]))

    def test_accessibility_conflict_resolution(self):
        text = "I want SH-2 on Friday at 10 am for a wheelchair-accessible poster session, 60 people."
        res = parse_booking_request(text, user_role="club")
        struct = res["structured"]
        # SH-2 is not accessible, code should recommend SH-1
        self.assertEqual(struct["requested_room"], "SH-1")
        self.assertTrue(any("NOT wheelchair accessible" in w for w in res["warnings"]))

    def test_faculty_change_parsing(self):
        text = "Prof. Sharma is on leave next Tuesday periods 2 to 4"
        res = parse_faculty_change_request(text, user_faculty_id="F01")
        self.assertEqual(res["day"], "TUE")
        self.assertIn(2, res["periods"])
        self.assertIn(3, res["periods"])
        self.assertIn(4, res["periods"])

    def test_explain_decision(self):
        explanation = explain_decision(
            "booking",
            {
                "status": "alternative_offered",
                "assigned_room": "SH-1",
                "reason": "Capacity of requested room was exceeded.",
            },
        )
        self.assertIn("alternative", explanation.lower())
        self.assertIn("SH-1", explanation)

    def test_manual_form_fallback_without_llm(self):
        text = "Book seminar hall for 80 people on Tuesday 6 to 8 pm, projector please."
        res = _regex_fallback_booking_parser(text, user_role="club")
        self.assertEqual(res["attendance"], 80)
        self.assertEqual(res["duration_periods"], 2)
        self.assertEqual(res["windows"][0]["day"], "TUE")
        self.assertIn("projector", res["needs"])

    def test_api_endpoints(self):
        # 1. Parse booking
        res = self.client.post(
            "/api/ai/parse-booking",
            json={"text": "Need a classroom for 30 students on Monday 10 to 12 pm", "user_role": "faculty"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("structured", data)
        self.assertEqual(data["structured"]["attendance"], 30)

        # 2. Parse change
        res = self.client.post(
            "/api/ai/parse-change",
            json={"text": "Room CR-101 is closed on Thursday for repair"},
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["day"], "THU")

        # 3. Explain decision
        res = self.client.post(
            "/api/ai/explain-decision",
            json={
                "decision_type": "booking",
                "data": {"status": "approved", "assigned_room": "CR-101", "reason": "Optimal slot."},
            },
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("approved", res.json()["explanation"].lower())


if __name__ == "__main__":
    unittest.main()
