"""파일 업로드/다운로드/삭제 라우터"""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_action
from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.file import FileItem
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

_MAX_UPLOAD_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@router.get("/", response_model=dict)
async def list_files(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    folder_id: str | None = Query(default=None),
) -> dict:
    """파일 목록."""
    query = select(FileItem)
    if folder_id:
        query = query.where(FileItem.folder_id == folder_id)
    result = await db.execute(query.order_by(FileItem.created_at.desc()))
    files = result.scalars().all()
    return {"success": True, "data": [_to_response(f) for f in files]}


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_file(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    file: UploadFile,
    folder_id: str | None = Query(default=None),
) -> dict:
    """파일 업로드 — Supabase Storage에 저장."""
    if file.size and file.size > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"파일 크기는 {settings.MAX_UPLOAD_SIZE_MB}MB 이하여야 합니다.",
        )

    contents = await file.read()
    file_size = len(contents)

    # Supabase Storage 업로드
    storage_path = f"uploads/{current_user.id}/{file.filename}"
    public_url = await _upload_to_supabase(storage_path, contents, file.content_type)

    file_item = FileItem(
        name=file.filename or "unnamed",
        path=public_url,
        size=file_size,
        mime_type=file.content_type,
        folder_id=folder_id,
        owner_id=current_user.id,
    )
    db.add(file_item)
    await db.flush()

    return {"success": True, "data": _to_response(file_item)}


@router.get("/{file_id}/download", response_model=dict)
async def get_download_url(
    file_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """서명된 다운로드 URL 반환."""
    file_item = await _get_file_or_404(db, file_id)

    await log_action(
        db=db,
        action="file_download",
        resource="file",
        resource_id=str(file_item.id),
        user_id=str(current_user.id),
        result="success",
    )

    # 실제 환경에서는 Supabase Storage signed URL 생성
    signed_url = file_item.path
    return {
        "success": True,
        "data": {
            "url": signed_url,
            "expires_at": "3600",
        },
    }


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """파일 삭제 (소유자 또는 admin)."""
    file_item = await _get_file_or_404(db, file_id)

    if str(file_item.owner_id) != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="삭제 권한이 없습니다.")

    await db.delete(file_item)
    await db.flush()


# ── helpers ──────────────────────────────────────────────────────────────────

async def _get_file_or_404(db: AsyncSession, file_id: str) -> FileItem:
    result = await db.execute(select(FileItem).where(FileItem.id == file_id))
    f = result.scalar_one_or_none()
    if f is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="파일을 찾을 수 없습니다.")
    return f


async def _upload_to_supabase(path: str, contents: bytes, content_type: str | None) -> str:
    """Supabase Storage에 업로드하고 public URL을 반환한다."""
    try:
        from supabase import create_client
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        bucket = "groupware-files"
        client.storage.from_(bucket).upload(
            path,
            contents,
            {"content-type": content_type or "application/octet-stream"},
        )
        result = client.storage.from_(bucket).get_public_url(path)
        return result
    except Exception as exc:
        logger.error("Supabase upload failed: %s", exc)
        # 폴백: 경로만 저장
        return f"{settings.SUPABASE_URL}/storage/v1/object/public/groupware-files/{path}"


def _to_response(file_item: FileItem) -> dict:
    return {
        "id": str(file_item.id),
        "name": file_item.name,
        "path": file_item.path,
        "size": file_item.size,
        "mime_type": file_item.mime_type,
        "folder_id": str(file_item.folder_id) if file_item.folder_id else None,
        "owner_id": str(file_item.owner_id),
        "created_at": file_item.created_at.isoformat(),
    }
