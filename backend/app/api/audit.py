"""Paginated audit log endpoint matching design.md §10."""
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from backend.app.db import get_session
from backend.app.models.entities import AuditEvent
from backend.app.schemas.suggestions import AuditEventResponse

router = APIRouter(prefix="/audit", tags=["audit"])

@router.get("", response_model=List[AuditEventResponse])
def get_audit_log(
    entity: Optional[str] = Query(None, description="Filter by entity type (e.g. suggestion, decision, ingest)"),
    entity_id: Optional[str] = Query(None, description="Filter by specific entity ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
):
    """Retrieve immutable append-only audit trail."""
    query = select(AuditEvent).order_by(AuditEvent.created_at.desc())
    if entity:
        query = query.where(AuditEvent.entity == entity)
    if entity_id:
        query = query.where(AuditEvent.entity_id == str(entity_id))

    events = session.exec(query.offset(offset).limit(limit)).all()

    results = []
    for ev in events:
        try:
            payload = json.loads(ev.payload_json) if ev.payload_json else {}
        except Exception:
            payload = {"raw": ev.payload_json}

        results.append(
            AuditEventResponse(
                id=ev.id,
                entity=ev.entity,
                entity_id=ev.entity_id,
                event=ev.event,
                payload=payload,
                created_at=ev.created_at,
            )
        )
    return results
