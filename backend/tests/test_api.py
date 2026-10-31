import os
import sys
import unittest
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
env_path = PROJECT_ROOT / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

from backend.app.main import app
from backend.app.init_db import init_database
from backend.app.database import SessionLocal, TimetableEntry, User
from fastapi.testclient import TestClient


class TestBackendAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_database()
        cls.client = TestClient(app)

    def _login(self, email, password):
        resp = self.client.post("/auth/login", json={"email": email, "password": password})
        self.assertEqual(resp.status_code, 200, f"Login failed for {email}: {resp.text}")
        data = resp.json()
        self.assertIn("access_token", data)
        return data["access_token"]

    def test_01_logins_for_all_four_roles(self):
        """Verify login as each of the 4 demo roles: admin, coordinator, faculty, club."""
        accounts = [
            ("admin@cit.test", "admin123", "admin"),
            ("coordinator@cit.test", "coord123", "coordinator"),
            ("faculty@cit.test", "faculty123", "faculty"),
            ("club@cit.test", "club123", "club"),
        ]
        for email, pwd, expected_role in accounts:
            token = self._login(email, pwd)
            me_resp = self.client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(me_resp.status_code, 200)
            data = me_resp.json()
            self.assertEqual(data["email"], email)
            self.assertEqual(data["role"], expected_role)

    def test_02_club_cannot_approve_changes(self):
        """Verify that a club user cannot approve a change request (403 Forbidden)."""
        club_token = self._login("club@cit.test", "club123")
        coordinator_token = self._login("coordinator@cit.test", "coord123")

        # Coordinator proposes a valid change
        prop_resp = self.client.post(
            "/changes/propose",
            headers={"Authorization": f"Bearer {coordinator_token}"},
            json={
                "change_type": "room_closed",
                "details": {
                    "room_id": "CR101",
                    "days": ["MON"],
                    "periods": [1, 2],
                    "reason": "Renovation work",
                },
                "reason": "Temporary room closure proposal",
            },
        )
        self.assertEqual(prop_resp.status_code, 201)
        change_id = prop_resp.json()["change_id"]

        # Club attempts to approve the change -> MUST fail with 403
        appr_resp = self.client.post(
            f"/changes/{change_id}/approve",
            headers={"Authorization": f"Bearer {club_token}"},
            json={"reason": "Unauthorized club approval attempt"},
        )
        self.assertEqual(appr_resp.status_code, 403)

    def test_03_non_admin_cannot_reset_demo(self):
        """Verify that a non-admin cannot reset the demo data (403 Forbidden)."""
        club_token = self._login("club@cit.test", "club123")
        coord_token = self._login("coordinator@cit.test", "coord123")
        fac_token = self._login("faculty@cit.test", "faculty123")

        for token in [club_token, coord_token, fac_token]:
            resp = self.client.post("/admin/reset-demo", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(resp.status_code, 403)

    def test_04_double_booked_room_is_blocked_with_reason(self):
        """Verify that a double-booked room request is blocked with a clear reason."""
        admin_token = self._login("admin@cit.test", "admin123")

        db = SessionLocal()
        try:
            # Find two sessions scheduled in different rooms at the same time
            entries = db.query(TimetableEntry).limit(10).all()
            session_a = entries[0]
            session_b = None
            for e in entries[1:]:
                if e.day == session_a.day and e.start_period == session_a.start_period:
                    session_b = e
                    break
            if not session_b:
                session_b = entries[1]
            sid_a = session_a.session_id
            target_day = session_b.day
            target_period = session_b.start_period
            target_room = session_b.room_id
        finally:
            db.close()

        # Try to manually move session_a into session_b's room at the exact same period (double booking)
        resp = self.client.post(
            "/timetable/manual-schedule",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "session_id": sid_a,
                "day": target_day,
                "start_period": target_period,
                "room_id": target_room,
                "reason": "Attempting intentional double-booking",
            },
        )
        self.assertEqual(resp.status_code, 400)
        detail = resp.json().get("detail", "")
        self.assertIn("breaks hard constraints", detail)

    def test_05_self_approval_is_refused(self):
        """Verify that nobody can approve their own request."""
        admin_token = self._login("admin@cit.test", "admin123")

        # Admin proposes a change
        prop_resp = self.client.post(
            "/changes/propose",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "change_type": "room_closed",
                "details": {
                    "room_id": "CR102",
                    "days": ["TUE"],
                    "periods": [3, 4],
                    "reason": "Projector repair",
                },
                "reason": "Repair request by admin",
            },
        )
        self.assertEqual(prop_resp.status_code, 201)
        change_id = prop_resp.json()["change_id"]

        # Admin tries to approve their own request -> MUST fail with 403
        appr_resp = self.client.post(
            f"/changes/{change_id}/approve",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"reason": "Self-approval attempt"},
        )
        self.assertEqual(appr_resp.status_code, 403)
        self.assertIn("Nobody can approve their own request", appr_resp.json().get("detail", ""))

    def test_06_faculty_unavailability_add_and_list(self):
        """Verify faculty can add and list unavailability."""
        fac_token = self._login("faculty@cit.test", "faculty123")

        # Add unavailability
        add_resp = self.client.post(
            "/faculty/unavailability",
            headers={"Authorization": f"Bearer {fac_token}"},
            json={
                "day": "WED",
                "periods": [1, 2],
                "reason": "Attending department symposium",
            },
        )
        self.assertEqual(add_resp.status_code, 200)

        # List unavailability
        list_resp = self.client.get("/faculty/unavailability", headers={"Authorization": f"Bearer {fac_token}"})
        self.assertEqual(list_resp.status_code, 200)
        self.assertGreater(list_resp.json()["total"], 0)

    def test_07_booking_workflow_and_cancellation(self):
        """Verify club booking creation, allocation, and cancellation."""
        club_token = self._login("club@cit.test", "club123")

        booking_data = {
            "title": "Robotics Club Expo",
            "attendance": 50,
            "duration_periods": 2,
            "requested_category": "club_event",
            "windows": [{"day": "THU", "from_period": 10, "to_period": 12}],
            "room_types": ["seminar_hall", "auditorium"],
            "needs": ["projector"],
        }
        create_resp = self.client.post(
            "/bookings",
            headers={"Authorization": f"Bearer {club_token}"},
            json=booking_data,
        )
        self.assertEqual(create_resp.status_code, 201)
        res = create_resp.json()
        booking_id = res["id"]
        self.assertIn(res["status"], ["approved", "alternative_offered", "rejected"])

        # Cancel own booking
        cancel_resp = self.client.post(
            f"/bookings/{booking_id}/cancel",
            headers={"Authorization": f"Bearer {club_token}"},
        )
        self.assertEqual(cancel_resp.status_code, 200)


if __name__ == "__main__":
    unittest.main()
