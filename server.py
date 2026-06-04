import http.server
import json
import os
import sqlite3
import socketserver
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from uuid import uuid4
 

PORT = int(os.environ.get("PORT", 8000))
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "psts.db"
MONGODB_URI = os.environ.get("MONGODB_URI", "").strip()
MONGODB_DB = os.environ.get("MONGODB_DB", "product_supply_tracking")
MONGODB_COLLECTION = os.environ.get("MONGODB_COLLECTION", "projects")


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def normalize_project(doc):
    return {
        "id": doc["id"],
        "state": doc["state"],
        "location": doc["location"],
        "projectName": doc["projectName"],
        "machineType": doc.get("machineType", "Powerpack"),
        "applicationType": doc.get("applicationType", ""),
        "status": doc.get("status", "Standby"),
        "deliveredMaterials": doc.get("deliveredMaterials", []),
        "requirements": doc.get("requirements", ""),
        "pendingItems": doc.get("pendingItems", []),
        "updatedAt": doc["updatedAt"],
    }


class MongoStore:
    def __init__(self):
        try:
            from pymongo import MongoClient
        except ImportError as exc:
            raise RuntimeError(
                "MongoDB is configured, but pymongo is not installed. "
                "Run: python -m pip install \"pymongo[srv]\""
            ) from exc

        self.client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=8000)
        self.collection = self.client[MONGODB_DB][MONGODB_COLLECTION]
        self.client.admin.command("ping")
        self.collection.create_index("id", unique=True)
        self.collection.create_index("state")

    def list_projects(self, state=None):
        query = {"state": state} if state else {}
        docs = self.collection.find(query, {"_id": 0}).sort("updatedAt", -1)
        return [normalize_project(doc) for doc in docs]

    def create_project(self, payload):
        project = {
            "id": uuid4().hex,
            "state": str(payload.get("state", "")).strip(),
            "location": str(payload.get("location", "")).strip(),
            "projectName": str(payload.get("projectName", "")).strip(),
            "machineType": str(payload.get("machineType") or "Powerpack").strip(),
            "applicationType": str(payload.get("applicationType") or "").strip(),
            "status": str(payload.get("status") or "Standby").strip(),
            "deliveredMaterials": payload.get("deliveredMaterials") or [],
            "requirements": str(payload.get("requirements") or "").strip(),
            "pendingItems": payload.get("pendingItems") or [],
            "updatedAt": utc_now(),
        }
        validate_project(project)
        self.collection.insert_one(project)
        return normalize_project(project)

    def update_pending_item(self, project_id, item_index, is_completed):
        project = self.collection.find_one({"id": project_id}, {"_id": 0})
        if not project:
            return None

        pending_items = project.get("pendingItems", [])
        if item_index < 0 or item_index >= len(pending_items):
            return None

        pending_items[item_index]["isCompleted"] = is_completed
        updated_at = utc_now()
        self.collection.update_one(
            {"id": project_id},
            {"$set": {"pendingItems": pending_items, "updatedAt": updated_at}},
        )
        return updated_at

    def delete_project(self, project_id):
        result = self.collection.delete_one({"id": project_id})
        return result.deleted_count


class SqliteStore:
    def __init__(self):
        with self.get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    state TEXT NOT NULL,
                    location TEXT NOT NULL,
                    project_name TEXT NOT NULL,
                    machine_type TEXT NOT NULL,
                    application_type TEXT DEFAULT '',
                    status TEXT NOT NULL,
                    delivered_materials TEXT NOT NULL DEFAULT '[]',
                    requirements TEXT DEFAULT '',
                    pending_items TEXT NOT NULL DEFAULT '[]',
                    updated_at TEXT NOT NULL
                )
                """
            )

    def get_connection(self):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    def row_to_project(self, row):
        return {
            "id": row["id"],
            "state": row["state"],
            "location": row["location"],
            "projectName": row["project_name"],
            "machineType": row["machine_type"],
            "applicationType": row["application_type"] or "",
            "status": row["status"],
            "deliveredMaterials": json.loads(row["delivered_materials"] or "[]"),
            "requirements": row["requirements"] or "",
            "pendingItems": json.loads(row["pending_items"] or "[]"),
            "updatedAt": row["updated_at"],
        }

    def list_projects(self, state=None):
        with self.get_connection() as conn:
            if state:
                rows = conn.execute(
                    "SELECT * FROM projects WHERE state = ? ORDER BY updated_at DESC",
                    (state,),
                ).fetchall()
            else:
                rows = conn.execute("SELECT * FROM projects ORDER BY updated_at DESC").fetchall()
        return [self.row_to_project(row) for row in rows]

    def create_project(self, payload):
        project = {
            "id": uuid4().hex,
            "state": str(payload.get("state", "")).strip(),
            "location": str(payload.get("location", "")).strip(),
            "projectName": str(payload.get("projectName", "")).strip(),
            "machineType": str(payload.get("machineType") or "Powerpack").strip(),
            "applicationType": str(payload.get("applicationType") or "").strip(),
            "status": str(payload.get("status") or "Standby").strip(),
            "deliveredMaterials": payload.get("deliveredMaterials") or [],
            "requirements": str(payload.get("requirements") or "").strip(),
            "pendingItems": payload.get("pendingItems") or [],
            "updatedAt": utc_now(),
        }
        validate_project(project)

        with self.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO projects (
                    id, state, location, project_name, machine_type,
                    application_type, status, delivered_materials,
                    requirements, pending_items, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    project["id"],
                    project["state"],
                    project["location"],
                    project["projectName"],
                    project["machineType"],
                    project["applicationType"],
                    project["status"],
                    json.dumps(project["deliveredMaterials"]),
                    project["requirements"],
                    json.dumps(project["pendingItems"]),
                    project["updatedAt"],
                ),
            )
        return project

    def update_pending_item(self, project_id, item_index, is_completed):
        with self.get_connection() as conn:
            row = conn.execute(
                "SELECT pending_items FROM projects WHERE id = ?",
                (project_id,),
            ).fetchone()
            if not row:
                return None

            pending_items = json.loads(row["pending_items"] or "[]")
            if item_index < 0 or item_index >= len(pending_items):
                return None

            pending_items[item_index]["isCompleted"] = is_completed
            updated_at = utc_now()
            conn.execute(
                "UPDATE projects SET pending_items = ?, updated_at = ? WHERE id = ?",
                (json.dumps(pending_items), updated_at, project_id),
            )
        return updated_at

    def delete_project(self, project_id):
        with self.get_connection() as conn:
            cursor = conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        return cursor.rowcount


def validate_project(project):
    if not project["state"] or not project["location"] or not project["projectName"]:
        raise ValueError("state, location, and projectName are required")
    if not isinstance(project["deliveredMaterials"], list):
        raise ValueError("deliveredMaterials must be a list")
    if not isinstance(project["pendingItems"], list):
        raise ValueError("pendingItems must be a list")


STORE = None


class MyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/projects":
            state = parse_qs(parsed.query).get("state", [None])[0]
            self.send_json(STORE.list_projects(state))
            return
        super().do_GET()

    def do_POST(self):
        if self.path != "/api/projects":
            self.send_error(404, "Not Found")
            return

        try:
            self.send_json(STORE.create_project(self.read_json_body()), 201)
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON"}, 400)
        except ValueError as exc:
            self.send_json({"error": str(exc)}, 400)
        except Exception as exc:
            self.send_json({"error": str(exc)}, 500)

    def do_PATCH(self):
        parts = urlparse(self.path).path.strip("/").split("/")
        if len(parts) != 5 or parts[0] != "api" or parts[1] != "projects" or parts[3] != "pending":
            self.send_error(404, "Not Found")
            return

        try:
            updated_at = STORE.update_pending_item(
                parts[2],
                int(parts[4]),
                bool(self.read_json_body().get("isCompleted")),
            )
            if not updated_at:
                self.send_json({"error": "Project or pending item not found"}, 404)
                return
            self.send_json({"success": True, "updatedAt": updated_at})
        except ValueError:
            self.send_json({"error": "Invalid pending item index"}, 400)
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON"}, 400)
        except Exception as exc:
            self.send_json({"error": str(exc)}, 500)

    def do_DELETE(self):
        parts = urlparse(self.path).path.strip("/").split("/")
        if len(parts) != 3 or parts[0] != "api" or parts[1] != "projects":
            self.send_error(404, "Not Found")
            return

        deleted = STORE.delete_project(parts[2])
        self.send_json({"success": deleted > 0, "deleted": deleted})


Handler = MyHandler
Handler.extensions_map.update({
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".css": "text/css",
    ".html": "text/html",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
})

socketserver.ThreadingTCPServer.allow_reuse_address = True

try:
    STORE = MongoStore() if MONGODB_URI else SqliteStore()
    backend = f"MongoDB Atlas database '{MONGODB_DB}'" if MONGODB_URI else f"SQLite database {DB_PATH}"
    with socketserver.ThreadingTCPServer(("", PORT), Handler) as httpd:
        print(f"Server started on port {PORT}. Using {backend}.", flush=True)
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\nShutting down server.", flush=True)
    sys.exit(0)
except Exception as e:
    print(f"Error starting server: {e}", flush=True)
    sys.exit(1)
