from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
import time
import os
import json
import sqlite3


@dataclass
class MetricsCollector:
    tracking_uri: str = "http://localhost:5000"
    experiment_name: str = "system2ml"
    _mlflow_client: Any = field(default=None, init=False)
    _active_runs: Dict[str, Any] = field(default_factory=dict, init=False)
    _db_path: str = "./system2ml_metrics.db"

    def __post_init__(self):
        self._init_db()
        self._init_mlflow()

    def _init_db(self):
        """Initialize local SQLite database for metrics storage"""
        conn = sqlite3.connect(self._db_path)
        c = conn.cursor()
        c.execute("""CREATE TABLE IF NOT EXISTS metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            metric TEXT NOT NULL,
            value REAL NOT NULL,
            timestamp TEXT NOT NULL
        )""")
        c.execute("""CREATE TABLE IF NOT EXISTS params (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            param TEXT NOT NULL,
            value TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )""")
        c.execute("""CREATE TABLE IF NOT EXISTS runs (
            run_id TEXT PRIMARY KEY,
            run_name TEXT,
            status TEXT,
            start_time TEXT,
            end_time TEXT
        )""")
        conn.commit()
        conn.close()

    def _init_mlflow(self):
        """Try to initialize MLflow client"""
        try:
            import mlflow

            mlflow.set_tracking_uri(self.tracking_uri)
            mlflow.set_experiment(self.experiment_name)
            self._mlflow_client = mlflow
        except ImportError:
            self._mlflow_client = None

    def log_metric(self, run_id: str, metric: str, value: float):
        """Log a metric to MLflow and local DB"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

        conn = sqlite3.connect(self._db_path)
        c = conn.cursor()
        c.execute(
            "INSERT INTO metrics (run_id, metric, value, timestamp) VALUES (?, ?, ?, ?)",
            (run_id, metric, value, timestamp),
        )
        conn.commit()
        conn.close()

        if self._mlflow_client:
            try:
                with self._mlflow_client.start_run(run_id=run_id):
                    self._mlflow_client.log_metric(
                        self._mlflow_client.Metric(metric, value, timestamp=int(time.time()))
                    )
            except Exception:
                pass

    def log_param(self, run_id: str, param: str, value: str):
        """Log a parameter to MLflow and local DB"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

        conn = sqlite3.connect(self._db_path)
        c = conn.cursor()
        c.execute(
            "INSERT INTO params (run_id, param, value, timestamp) VALUES (?, ?, ?, ?)",
            (run_id, param, value, timestamp),
        )
        conn.commit()
        conn.close()

        if self._mlflow_client:
            try:
                with self._mlflow_client.start_run(run_id=run_id):
                    self._mlflow_client.log_param(param, value)
            except Exception:
                pass

    def log_artifact(self, run_id: str, artifact_path: str):
        """Log an artifact to MLflow"""
        if self._mlflow_client:
            try:
                with self._mlflow_client.start_run(run_id=run_id):
                    self._mlflow_client.log_artifact(artifact_path)
            except Exception:
                pass

    def start_run(self, run_name: Optional[str] = None) -> str:
        """Start a new MLflow run"""
        import uuid

        run_id = f"run_{uuid.uuid4().hex[:8]}"
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

        conn = sqlite3.connect(self._db_path)
        c = conn.cursor()
        c.execute(
            "INSERT INTO runs (run_id, run_name, status, start_time) VALUES (?, ?, ?, ?)",
            (run_id, run_name, "running", timestamp),
        )
        conn.commit()
        conn.close()

        if self._mlflow_client:
            try:
                mlflow_run = self._mlflow_client.start_run(run_name=run_name)
                self._active_runs[run_id] = mlflow_run
            except Exception:
                pass

        return run_id

    def end_run(self, run_id: str, status: str = "completed"):
        """End an MLflow run"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

        conn = sqlite3.connect(self._db_path)
        c = conn.cursor()
        c.execute(
            "UPDATE runs SET status=?, end_time=? WHERE run_id=?", (status, timestamp, run_id)
        )
        conn.commit()
        conn.close()

        if run_id in self._active_runs:
            try:
                self._active_runs[run_id].end_run()
            except Exception:
                pass
            del self._active_runs[run_id]

    def get_run_metrics(self, run_id: str) -> List[Dict]:
        """Get all metrics for a run"""
        conn = sqlite3.connect(self._db_path)
        c = conn.cursor()
        c.execute(
            "SELECT metric, value, timestamp FROM metrics WHERE run_id=? ORDER BY timestamp",
            (run_id,),
        )
        rows = c.fetchall()
        conn.close()
        return [{"metric": r[0], "value": r[1], "timestamp": r[2]} for r in rows]

    def get_run_params(self, run_id: str) -> Dict:
        """Get all params for a run"""
        conn = sqlite3.connect(self._db_path)
        c = conn.cursor()
        c.execute("SELECT param, value FROM params WHERE run_id=?", (run_id,))
        rows = c.fetchall()
        conn.close()
        return {r[0]: r[1] for r in rows}


@dataclass
class CarbonTracker:
    enabled: bool = True
    output_dir: str = "./carbon_reports"
    _tracker: Any = field(default=None, init=False)
    _db_path: str = "./system2ml_carbon.db"

    def __post_init__(self):
        os.makedirs(self.output_dir, exist_ok=True)
        self._init_db()
        self._init_codecarbon()

    def _init_db(self):
        """Initialize local SQLite database for carbon tracking"""
        conn = sqlite3.connect(self._db_path)
        c = conn.cursor()
        c.execute("""CREATE TABLE IF NOT EXISTS carbon_tracking (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            duration_seconds REAL,
            carbon_kg REAL,
            energy_kwh REAL,
            country_iso_code TEXT,
            timestamp TEXT NOT NULL
        )""")
        conn.commit()
        conn.close()

    def _init_codecarbon(self):
        """Try to initialize CodeCarbon tracker"""
        try:
            from codecarbon import EmissionsTracker

            self._tracker = EmissionsTracker(
                save_to_file=True,
                output_dir=self.output_dir,
                tracking_mode="process",
            )
        except ImportError:
            self._tracker = None

    def start(self, run_id: str = None):
        """Start carbon tracking"""
        self.run_id = run_id or f"run_{int(time.time())}"
        self.start_time = time.time()

        if self._tracker and self.enabled:
            try:
                self._tracker.start()
            except Exception:
                pass

    def stop(self, run_id: str = None) -> dict:
        """Stop carbon tracking and return results"""
        duration = time.time() - self.start_time

        carbon_kg = 0.0
        energy_kwh = 0.0
        country_iso_code = None

        if self._tracker and self.enabled:
            try:
                emissions = self._tracker.stop()
                if emissions:
                    carbon_kg = emissions
                    energy_kwh = emissions * 0.5
            except Exception:
                pass

        if carbon_kg == 0.0:
            carbon_kg = self._estimate_carbon(duration)
            energy_kwh = carbon_kg * 0.5

        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

        conn = sqlite3.connect(self._db_path)
        c = conn.cursor()
        c.execute(
            """INSERT INTO carbon_tracking 
                     (run_id, duration_seconds, carbon_kg, energy_kwh, country_iso_code, timestamp) 
                     VALUES (?, ?, ?, ?, ?, ?)""",
            (run_id or self.run_id, duration, carbon_kg, energy_kwh, country_iso_code, timestamp),
        )
        conn.commit()
        conn.close()

        return {
            "run_id": run_id or self.run_id,
            "duration_seconds": duration,
            "carbon_kg": carbon_kg,
            "energy_kwh": energy_kwh,
            "country_iso_code": country_iso_code,
        }

    def _estimate_carbon(self, duration_seconds: float) -> float:
        """Estimate carbon based on typical GPU power usage"""
        gpu_watts = 150.0
        cpu_watts = 65.0
        total_watts = gpu_watts + cpu_watts
        energy_kwh = (total_watts * duration_seconds) / 3600000
        carbon_factor = 0.5
        return energy_kwh * carbon_factor

    def get_carbon_report(self, run_id: str = None) -> dict:
        """Get carbon report for a run"""
        conn = sqlite3.connect(self._db_path)
        c = conn.cursor()

        if run_id:
            c.execute(
                """SELECT duration_seconds, carbon_kg, energy_kwh, country_iso_code, timestamp 
                        FROM carbon_tracking WHERE run_id=? ORDER BY timestamp DESC LIMIT 1""",
                (run_id,),
            )
        else:
            c.execute("""SELECT duration_seconds, carbon_kg, energy_kwh, country_iso_code, timestamp 
                        FROM carbon_tracking ORDER BY timestamp DESC LIMIT 1""")

        row = c.fetchone()
        conn.close()

        if row:
            return {
                "run_id": run_id,
                "duration_seconds": row[0],
                "carbon_kg": row[1],
                "energy_kwh": row[2],
                "country_iso_code": row[3],
                "timestamp": row[4],
            }

        return {
            "carbon_kg": 0.0,
            "energy_kwh": 0.0,
            "carbon_intensity": 0.0,
        }


__all__ = ["MetricsCollector", "CarbonTracker"]
