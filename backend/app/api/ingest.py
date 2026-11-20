"""API routes for CSV data ingest."""
from io import StringIO
from typing import Optional
import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlmodel import Session

from backend.app.db import get_session
from backend.app.core.ingest import IngestValidationError, load_validated_csv, VALIDATORS

router = APIRouter(prefix="/ingest", tags=["ingest"])

@router.post("/csv")
async def ingest_csv(
    file_type: str = Form(...),
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    clean_file_type = file_type.strip().lower()
    if clean_file_type not in VALIDATORS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "INVALID_FILE_TYPE",
                    "message": f"Unsupported file_type '{file_type}'. Supported: {sorted(VALIDATORS.keys())}",
                }
            },
        )

    content = await file.read()
    try:
        df = pd.read_csv(StringIO(content.decode("utf-8")))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": "CSV_PARSE_ERROR",
                    "message": f"Could not parse CSV file: {str(e)}",
                }
            },
        )

    try:
        rows_loaded = load_validated_csv(clean_file_type, df, session)
        return {
            "status": "success",
            "file_type": clean_file_type,
            "rows_loaded": rows_loaded,
        }
    except IngestValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": "CSV_VALIDATION_ERROR",
                    "message": str(e),
                    "details": {
                        "file_type": e.file_type,
                        "errors": [err.to_dict() for err in e.errors],
                    },
                }
            },
        )
