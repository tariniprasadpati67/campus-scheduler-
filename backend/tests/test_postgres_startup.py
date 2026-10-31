import os
import subprocess
import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class TestPostgreSQLStartup(unittest.TestCase):
    def test_missing_database_url_stops_at_startup(self):
        """Verify startup stops with clear error when DATABASE_URL is missing."""
        code = (
            "import os, sys, unittest.mock as mock\n"
            "with mock.patch('dotenv.load_dotenv'):\n"
            "    os.environ.pop('DATABASE_URL', None)\n"
            "    import backend.app.config\n"
        )
        result = subprocess.run(
            [sys.executable, "-c", code],
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
        )
        self.assertNotEqual(result.returncode, 0)
        output = (result.stderr + result.stdout).strip()
        self.assertIn("DATABASE_URL is missing", output)

    def test_non_postgresql_database_url_stops_at_startup(self):
        """Verify startup stops with clear error when DATABASE_URL does not start with postgresql."""
        code = (
            "import os, sys, unittest.mock as mock\n"
            "with mock.patch('dotenv.load_dotenv'):\n"
            "    os.environ['DATABASE_URL'] = 'sqlite:///./cit.db'\n"
            "    import backend.app.config\n"
        )
        result = subprocess.run(
            [sys.executable, "-c", code],
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
        )
        self.assertNotEqual(result.returncode, 0)
        output = (result.stderr + result.stdout).strip()
        self.assertIn("must start with 'postgresql'", output)

    def test_postgresql_startup_prints_only_using_postgresql(self):
        """Verify startup prints ONLY 'Using PostgreSQL', never the URL or secret/password."""
        secret_password = "SuperSecretDbPassword123"
        test_url = f"postgresql://cit_user:{secret_password}@localhost:5432/cit_db"
        code = (
            "import os, sys, unittest.mock as mock\n"
            "with mock.patch('dotenv.load_dotenv'):\n"
            f"    os.environ['DATABASE_URL'] = '{test_url}'\n"
            "    import backend.app.config\n"
        )
        result = subprocess.run(
            [sys.executable, "-c", code],
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0)
        stdout_lines = [line.strip() for line in result.stdout.strip().splitlines() if line.strip()]
        self.assertIn("Using PostgreSQL", stdout_lines)
        self.assertNotIn(secret_password, result.stdout)
        self.assertNotIn("localhost:5432", result.stdout)
        self.assertNotIn(secret_password, result.stderr)


if __name__ == "__main__":
    unittest.main()
