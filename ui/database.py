import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

import sqlite3
import json
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, asdict

DB_PATH = "system2ml.db"


def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS pipelines (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            data_type TEXT NOT NULL,
            objective TEXT NOT NULL,
            constraints TEXT NOT NULL,
            deployment TEXT NOT NULL,
            retraining TEXT NOT NULL,
            status TEXT DEFAULT 'draft',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS pipeline_designs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pipeline_id TEXT NOT NULL,
            rank INTEGER NOT NULL,
            model TEXT NOT NULL,
            model_family TEXT,
            estimated_accuracy REAL,
            estimated_cost REAL,
            estimated_carbon REAL,
            estimated_latency REAL,
            meets_constraints INTEGER,
            explanation TEXT,
            pipeline_spec TEXT,
            score REAL,
            FOREIGN KEY (pipeline_id) REFERENCES pipelines(id)
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS runs (
            id TEXT PRIMARY KEY,
            pipeline_id TEXT NOT NULL,
            design_id INTEGER,
            status TEXT DEFAULT 'pending',
            metrics TEXT,
            started_at TEXT NOT NULL,
            completed_at TEXT,
            error_message TEXT,
            FOREIGN KEY (pipeline_id) REFERENCES pipelines(id)
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS failures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pipeline_id TEXT,
            run_id TEXT,
            error_type TEXT,
            error_message TEXT,
            stack_trace TEXT,
            suggested_fix TEXT,
            frequency INTEGER DEFAULT 1,
            is_resolved INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            actor TEXT,
            severity TEXT DEFAULT 'low',
            created_at TEXT NOT NULL
        )
    ''')
    
    conn.commit()
    conn.close()
    print(f"[DB] Initialized database at {DB_PATH}")


def get_db():
    return sqlite3.connect(DB_PATH)


@dataclass
class PipelineStore:
    @staticmethod
    def create(pipeline_id: str, name: str, data_type: str, objective: str, 
               constraints: dict, deployment: str, retraining: str) -> str:
        conn = get_db()
        c = conn.cursor()
        now = datetime.utcnow().isoformat()
        
        c.execute('''
            INSERT INTO pipelines (id, name, data_type, objective, constraints, deployment, retraining, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (pipeline_id, name, data_type, objective, json.dumps(constraints), deployment, retraining, now, now))
        
        conn.commit()
        conn.close()
        return pipeline_id
    
    @staticmethod
    def get_all():
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM pipelines ORDER BY created_at DESC')
        rows = c.fetchall()
        conn.close()
        return [dict(zip([col[0] for col in c.description], row)) for row in rows]
    
    @staticmethod
    def get_by_id(pipeline_id: str):
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM pipelines WHERE id = ?', (pipeline_id,))
        row = c.fetchone()
        conn.close()
        if row:
            return dict(zip([col[0] for col in c.description], row))
        return None
    
    @staticmethod
    def update_status(pipeline_id: str, status: str):
        conn = get_db()
        c = conn.cursor()
        c.execute('UPDATE pipelines SET status = ?, updated_at = ? WHERE id = ?', 
                  (status, datetime.utcnow().isoformat(), pipeline_id))
        conn.commit()
        conn.close()


@dataclass
class DesignStore:
    @staticmethod
    def create(pipeline_id: str, design: dict, rank: int):
        conn = get_db()
        c = conn.cursor()
        
        c.execute('''
            INSERT INTO pipeline_designs (pipeline_id, rank, model, model_family, estimated_accuracy, 
                estimated_cost, estimated_carbon, estimated_latency, meets_constraints, 
                explanation, pipeline_spec, score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            pipeline_id, rank, design.get('model'), design.get('model_family'),
            design.get('estimated_accuracy'), design.get('estimated_cost'),
            design.get('estimated_carbon'), design.get('estimated_latency'),
            1 if design.get('meets_constraints') else 0,
            design.get('explanation'), json.dumps(design.get('pipeline_spec', {})),
            design.get('score', 0)
        ))
        
        conn.commit()
        conn.close()
    
    @staticmethod
    def get_by_pipeline(pipeline_id: str):
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM pipeline_designs WHERE pipeline_id = ? ORDER BY rank', (pipeline_id,))
        rows = c.fetchall()
        conn.close()
        return [dict(zip([col[0] for col in c.description], row)) for row in rows]


@dataclass
class RunStore:
    @staticmethod
    def create(run_id: str, pipeline_id: str, design_id: int = None):
        conn = get_db()
        c = conn.cursor()
        now = datetime.utcnow().isoformat()
        
        c.execute('''
            INSERT INTO runs (id, pipeline_id, design_id, status, started_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (run_id, pipeline_id, design_id, 'running', now))
        
        conn.commit()
        conn.close()
        return run_id
    
    @staticmethod
    def update_status(run_id: str, status: str, metrics: dict = None, error: str = None):
        conn = get_db()
        c = conn.cursor()
        now = datetime.utcnow().isoformat()
        
        c.execute('UPDATE runs SET status = ?, completed_at = ?, metrics = ?, error_message = ? WHERE id = ?',
                  (status, now, json.dumps(metrics) if metrics else None, error, run_id))
        
        conn.commit()
        conn.close()
    
    @staticmethod
    def get_all():
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM runs ORDER BY started_at DESC')
        rows = c.fetchall()
        conn.close()
        return [dict(zip([col[0] for col in c.description], row)) for row in rows]
    
    @staticmethod
    def get_by_pipeline(pipeline_id: str):
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM runs WHERE pipeline_id = ? ORDER BY started_at DESC', (pipeline_id,))
        rows = c.fetchall()
        conn.close()
        return [dict(zip([col[0] for col in c.description], row)) for row in rows]


@dataclass
class ActivityStore:
    @staticmethod
    def log(type_: str, title: str, description: str = "", actor: str = "System", severity: str = "low"):
        conn = get_db()
        c = conn.cursor()
        now = datetime.utcnow().isoformat()
        
        c.execute('''
            INSERT INTO activities (type, title, description, actor, severity, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (type_, title, description, actor, severity, now))
        
        conn.commit()
        conn.close()
    
    @staticmethod
    def get_recent(limit: int = 20):
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM activities ORDER BY created_at DESC LIMIT ?', (limit,))
        rows = c.fetchall()
        conn.close()
        return [dict(zip([col[0] for col in c.description], row)) for row in rows]


@dataclass
class FailureStore:
    @staticmethod
    def create(pipeline_id: str, run_id: str, error_type: str, error_message: str, 
               stack_trace: str = "", suggested_fix: str = ""):
        conn = get_db()
        c = conn.cursor()
        now = datetime.utcnow().isoformat()
        
        c.execute('''
            INSERT INTO failures (pipeline_id, run_id, error_type, error_message, stack_trace, suggested_fix, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (pipeline_id, run_id, error_type, error_message, stack_trace, suggested_fix, now))
        
        conn.commit()
        conn.close()
    
    @staticmethod
    def get_all():
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM failures ORDER BY created_at DESC')
        rows = c.fetchall()
        conn.close()
        return [dict(zip([col[0] for col in c.description], row)) for row in rows]


init_db()
