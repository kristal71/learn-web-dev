from pydantic import BaseModel, ConfigDict, Field

class MasterBase(BaseModel):
    name: str
    specialization: str


class MasterResponse(MasterBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ServiceCreate(BaseModel):
    categoryId: int
    title: str = Field(..., min_length=1, max_length=100)
    desc: str = Field(..., min_length=1, max_length=100)
    duration: int = Field(..., ge=30, le=180)
    price: float = Field(..., gt=0)

    model_config = ConfigDict(populate_by_name=True)


class ServiceResponse(ServiceCreate):
    id: int
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)