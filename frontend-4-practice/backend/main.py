from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine, get_db
from models import Master
from schemas import MasterResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if db.query(Master).count() == 0:
            initial_masters = [
                Master(id=1, name="Анна", specialization="Парикмахер"),
                Master(id=2, name="Мария", specialization="Визажист"),
            ]
            db.add_all(initial_masters)
            db.commit()
    finally:
        db.close()

    yield


app = FastAPI(title="Salon API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/masters", response_model=List[MasterResponse])
def get_masters(
    specialization: Optional[str] = Query(
        None, description="Фильтрация по специализации мастера"
    ),
    db: Session = Depends(get_db),
):
    query = db.query(Master)
    if specialization:
        query = query.filter(Master.specialization == specialization)
    return query.all()


@app.get("/masters/{master_id}", response_model=MasterResponse)
def get_master(master_id: int, db: Session = Depends(get_db)):
    master = db.query(Master).filter(Master.id == master_id).first()
    if not master:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master not found",
        )
    return master