"""Database session and table initialization."""
from typing import Generator
from sqlmodel import SQLModel, create_engine, Session
from backend.app.config import settings

# SQLite connection args for dev
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
engine = create_engine(settings.DATABASE_URL, echo=False, connect_args=connect_args)

def init_db(target_engine=None) -> None:
    """Create all database tables."""
    eng = target_engine or engine
    SQLModel.metadata.create_all(eng)

def get_session() -> Generator[Session, None, None]:
    """Dependency for obtaining DB session."""
    with Session(engine) as session:
        yield session
