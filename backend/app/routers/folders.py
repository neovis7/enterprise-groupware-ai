"""폴더 관리 라우터"""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.file import Folder
from app.models.user import User
from app.schemas.file import FolderCreate, FolderResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=dict)
async def list_folders(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """폴더 목록 — 트리 구조."""
    result = await db.execute(select(Folder).order_by(Folder.name))
    folders = result.scalars().all()
    return {"success": True, "data": _build_tree(folders)}


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_folder(
    body: FolderCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """폴더 생성."""
    folder = Folder(
        name=body.name,
        parent_id=body.parent_id,
        team_id=body.team_id,
        owner_id=current_user.id,
    )
    db.add(folder)
    await db.flush()
    return {"success": True, "data": _to_response(folder)}


# ── helpers ──────────────────────────────────────────────────────────────────

def _to_response(folder: Folder) -> dict:
    return {
        "id": str(folder.id),
        "name": folder.name,
        "parent_id": str(folder.parent_id) if folder.parent_id else None,
        "team_id": str(folder.team_id) if folder.team_id else None,
        "owner_id": str(folder.owner_id),
        "created_at": folder.created_at.isoformat(),
        "children": [],
    }


def _build_tree(folders: list[Folder]) -> list[dict]:
    nodes: dict[str, dict] = {str(f.id): _to_response(f) for f in folders}
    roots: list[dict] = []
    for f in folders:
        node = nodes[str(f.id)]
        if f.parent_id and str(f.parent_id) in nodes:
            nodes[str(f.parent_id)]["children"].append(node)
        else:
            roots.append(node)
    return roots
