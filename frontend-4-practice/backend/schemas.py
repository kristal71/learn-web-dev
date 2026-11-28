from pydantic import BaseModel, ConfigDict


class MasterBase(BaseModel):
    name: str
    specialization: str


class MasterResponse(MasterBase):
    id: int

    model_config = ConfigDict(from_attributes=True)