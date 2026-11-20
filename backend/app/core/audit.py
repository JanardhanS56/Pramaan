"""Deterministic audit logging and input hashing."""
import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict
from sqlmodel import Session
from backend.app.models.entities import AuditEvent

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def compute_input_hash(data: Dict[str, Any]) -> str:
    """Compute deterministic SHA-256 hash of sorted key-value mapping."""
    canonical_json = json.dumps(data, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

def log_audit_event(
    session: Session,
    entity: str,
    entity_id: str,
    event: str,
    payload: Dict[str, Any],
) -> AuditEvent:
    """Persist append-only audit event."""
    audit_event = AuditEvent(
        entity=entity,
        entity_id=str(entity_id),
        event=event,
        payload_json=json.dumps(payload, default=str),
        created_at=utc_now(),
    )
    session.add(audit_event)
    session.commit()
    session.refresh(audit_event)
    return audit_event
