import os
import sys
import unittest
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
env_path = PROJECT_ROOT / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

db_url = os.getenv("DATABASE_URL", "").strip()
HAS_POSTGRES = bool(db_url and (db_url.startswith("postgresql://") or db_url.startswith("postgresql+")))


class TestFastAPIBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not HAS_POSTGRES:
            raise unittest.SkipTest("DATABASE_URL with postgresql is not configured in .env. Skipping live database tests.")

        try:
            from sqlalchemy import create_engine, text
            engine = create_engine(db_url, pool_pre_ping=True)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
        except Exception as exc:
            raise unittest.SkipTest(f"PostgreSQL database is currently unreachable: {exc}")

        from backend.app.main import app
        from backend.app.init_db import init_database
        from backend.app.database import SessionLocal, TimetableEntry, User
        from fastapi.testclient import TestClient

        cls.app = app
        cls.SessionLocal = SessionLocal
        cls.TimetableEntry = TimetableEntry
        cls.User = User
        init_database()
        cls.client = TestClient(app)

    def _login(self, username, password):
        resp = self.client.post("/api/auth/login", json={"username": username, "password": password})
        self.assertEqual(resp.status_code, 200, f"Login failed for {username}: {resp.text}")
        data = resp.json()
        self.assertIn("access_token", data)
        return data["access_token"]

    def test_01_logins_for_all_four_roles(self):
        """Verify login for admin, department coordinator, faculty, and club representative."""
        roles_creds = [
            ("admin", "admin123", "admin"),
            ("coordinator", "coord123", "department_coordinator"),
            ("faculty", "faculty123", "faculty"),
            ("club", "club123", "club"),
        ]
        for uname, pwd, expected_role in roles_creds:
            token = self._login(uname, pwd)
            me_resp = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(me_resp.status_code, 200)
            me_data = me_resp.json()
            self.assertEqual(me_data["username"], uname)
            self.assertEqual(me_data["role"], expected_role)

    def test_02_permission_checks(self):
        """Verify role-based permission boundaries and restrictions."""
        club_token = self._login("club", "club123")
        admin_token = self._login("admin", "admin123")

        # 1. Club cannot access admin endpoints
        resp = self.client.post("/api/admin/reset-demo-data", headers={"Authorization": f"Bearer {club_token}"})
        self.assertEqual(resp.status_code, 403, "Club should be blocked from resetting demo data")

        resp = self.client.get("/api/admin/audit-logs", headers={"Authorization": f"Bearer {club_token}"})
        self.assertEqual(resp.status_code, 403, "Club should be blocked from viewing admin audit logs")

        # 2. Nobody can approve their own request
        prop_resp = self.client.post(
            "/api/changes/propose",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "change_type": "room_unavailable",
                "details": {
                    "room_id": "CR101",
                    "days": ["MON"],
                    "periods": [1, 2],
                    "reason": "Air conditioner maintenance",
                },
                "reason": "AC maintenance test proposal",
            },
        )
        self.assertEqual(prop_resp.status_code, 201)
        change_id = prop_resp.json()["change_id"]

        # Admin tries to approve their own proposal -> Must fail with 403
        appr_resp = self.client.post(
            f"/api/changes/{change_id}/approve",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"reason": "Self-approval attempt"},
        )
        self.assertEqual(appr_resp.status_code, 403)
        self.assertIn("Nobody can approve their own request", appr_resp.json()["detail"])

    def test_03_blocked_conflict_manual_schedule(self):
        """Verify that a manual schedule violating hard constraints is rejected with a clear reason."""
        admin_token = self._login("admin", "admin123")

        db = self.SessionLocal()
        try:
            entry = db.query(self.TimetableEntry).first()
            self.assertIsNotNone(entry, "Expected at least one session in DB timetable")
            target_sid = entry.session_id
        finally:
            db.close()

        # Propose placing it at period 10 (invalid teaching period, teaching is P1-P9)
        bad_resp = self.client.post(
            "/api/timetable/manual-schedule",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "session_id": target_sid,
                "day": "MON",
                "start_period": 10,
                "room_id": "CR101",
                "reason": "Attempting invalid period placement",
            },
        )
        self.assertEqual(bad_resp.status_code, 400, "Should reject placement with hard constraint violation")
        detail = bad_resp.json().get("detail", "")
        self.assertIn("breaks hard constraints", detail)

    def test_04_timetable_queries_and_utilisation(self):
        """Verify timetable listing, room utilisation, and conflicts endpoints."""
        token = self._login("admin", "admin123")

        # Timetable
        tt_resp = self.client.get("/api/timetable?group_id=Y1-A", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(tt_resp.status_code, 200)
        self.assertGreater(tt_resp.json()["total"], 0)

        # Utilisation
        util_resp = self.client.get("/api/timetable/utilisation", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(util_resp.status_code, 200)
        self.assertIn("utilisation", util_resp.json())
        self.assertGreater(len(util_resp.json()["utilisation"]), 0)

        # Conflicts
        conf_resp = self.client.get("/api/timetable/conflicts", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(conf_resp.status_code, 200)
        conf_data = conf_resp.json()
        self.assertTrue(conf_data["is_valid"])
        self.assertEqual(conf_data["hard_violations_count"], 0)

    def test_05_booking_workflow(self):
        """Verify booking creation, status decision, and cancellation."""
        club_token = self._login("club", "club123")

        # Create booking
        booking_data = {
            "title": "Robotics Club Workshop",
            "attendance": 50,
            "duration_periods": 2,
            "requested_category": "club_event",
            "windows": [{"day": "THU", "from_period": 10, "to_period": 12}],
            "room_types": ["seminar_hall", "auditorium"],
            "needs": ["projector"],
        }
        create_resp = self.client.post(
            "/api/bookings",
            headers={"Authorization": f"Bearer {club_token}"},
            json=booking_data,
        )
        self.assertEqual(create_resp.status_code, 201)
        res = create_resp.json()
        req_id = res["request_id"]
        self.assertIn(res["status"], ["approved", "alternative_offered", "rejected"])
        self.assertTrue(len(res["reason"]) > 0)

        # Cancel booking
        cancel_resp = self.client.post(
            f"/api/bookings/{req_id}/cancel",
            headers={"Authorization": f"Bearer {club_token}"},
        )
        self.assertEqual(cancel_resp.status_code, 200)
        self.assertEqual(cancel_resp.json()["status"], "success")


if __name__ == "__main__":
    unittest.main()
