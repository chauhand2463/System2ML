import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

import sqlite3
import json
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass, asdict

DB_PATH = "system2ml.db"

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def generate_token() -> str:
    return secrets.token_urlsafe(32)


def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            avatar TEXT,
            provider TEXT DEFAULT 'email',
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
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
    def update(run_id: str, status: str, metrics: dict = None, error: str = None):
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
        c.execute('''
            SELECT r.*, p.name as pipeline_name 
            FROM runs r 
            JOIN pipelines p ON r.pipeline_id = p.id 
            ORDER BY r.started_at DESC
        ''')
        rows = c.fetchall()
        conn.close()
        return [dict(zip([col[0] for col in c.description], row)) for row in rows]
    
    @staticmethod
    def get_by_id(run_id: str):
        conn = get_db()
        c = conn.cursor()
        c.execute('''
            SELECT r.*, p.name as pipeline_name 
            FROM runs r 
            JOIN pipelines p ON r.pipeline_id = p.id 
            WHERE r.id = ?
        ''', (run_id,))
        row = c.fetchone()
        conn.close()
        if row:
            return dict(zip([col[0] for col in c.description], row))
        return None
    
    @staticmethod
    def get_by_pipeline(pipeline_id: str):
        conn = get_db()
        c = conn.cursor()
        c.execute('''
            SELECT r.*, p.name as pipeline_name 
            FROM runs r 
            JOIN pipelines p ON r.pipeline_id = p.id 
            WHERE r.pipeline_id = ? 
            ORDER BY r.started_at DESC
        ''', (pipeline_id,))
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


@dataclass
class UserStore:
    @staticmethod
    def create(email: str, password: str, name: str, provider: str = 'email') -> Optional[dict]:
        conn = get_db()
        c = conn.cursor()
        now = datetime.utcnow().isoformat()
        
        try:
            c.execute('''
                INSERT INTO users (email, password_hash, name, provider, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (email, hash_password(password), name, provider, now, now))
            
            user_id = c.lastrowid
            conn.commit()
            
            c.execute('SELECT * FROM users WHERE id = ?', (user_id,))
            row = c.fetchone()
            conn.close()
            
            if row:
                user = dict(zip([col[0] for col in c.description], row))
                del user['password_hash']
                return user
            return None
        except sqlite3.IntegrityError:
            conn.close()
            return None
    
    @staticmethod
    def get_by_email(email: str) -> Optional[dict]:
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM users WHERE email = ?', (email,))
        row = c.fetchone()
        conn.close()
        if row:
            return dict(zip([col[0] for col in c.description], row))
        return None
    
    @staticmethod
    def get_by_id(user_id: int) -> Optional[dict]:
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        row = c.fetchone()
        conn.close()
        if row:
            user = dict(zip([col[0] for col in c.description], row))
            del user['password_hash']
            return user
        return None
    
    @staticmethod
    def verify_login(email: str, password: str) -> Optional[dict]:
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM users WHERE email = ? AND provider = ?', (email, 'email'))
        row = c.fetchone()
        conn.close()
        
        if row and verify_password(password, row[2]):
            user = dict(zip(['id', 'email', 'password_hash', 'name', 'avatar', 'provider', 'is_active', 'created_at', 'updated_at'], row))
            del user['password_hash']
            return user
        return None
    
    @staticmethod
    def update_avatar(user_id: int, avatar: str):
        conn = get_db()
        c = conn.cursor()
        c.execute('UPDATE users SET avatar = ?, updated_at = ? WHERE id = ?', 
                  (avatar, datetime.utcnow().isoformat(), user_id))
        conn.commit()
        conn.close()


@dataclass
class SessionStore:
    @staticmethod
    def create(user_id: int, token: str, expires_in_days: int = 7) -> str:
        conn = get_db()
        c = conn.cursor()
        now = datetime.utcnow()
        expires_at = (now + timedelta(days=expires_in_days)).isoformat()
        
        c.execute('''
            INSERT INTO sessions (user_id, token, expires_at, created_at)
            VALUES (?, ?, ?, ?)
        ''', (user_id, token, expires_at, now.isoformat()))
        
        conn.commit()
        conn.close()
        return token
    
    @staticmethod
    def get_user_by_token(token: str) -> Optional[dict]:
        conn = get_db()
        c = conn.cursor()
        
        c.execute('''
            SELECT u.* FROM users u
            JOIN sessions s ON u.id = s.user_id
            WHERE s.token = ? AND s.expires_at > ?
        ''', (token, datetime.utcnow().isoformat()))
        
        row = c.fetchone()
        conn.close()
        
        if row:
            user = dict(zip(['id', 'email', 'password_hash', 'name', 'avatar', 'provider', 'is_active', 'created_at', 'updated_at'], row))
            del user['password_hash']
            return user
        return None
    
    @staticmethod
    def delete(token: str):
        conn = get_db()
        c = conn.cursor()
        c.execute('DELETE FROM sessions WHERE token = ?', (token,))
        conn.commit()
        conn.close()
    
    @staticmethod
    def delete_user_sessions(user_id: int):
        conn = get_db()
        c = conn.cursor()
        c.execute('DELETE FROM sessions WHERE user_id = ?', (user_id,))
        conn.commit()
        conn.close()


init_db()
