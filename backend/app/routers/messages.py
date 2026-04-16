"""메시지 라우터"""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.message import ChatRoom, ChatRoomMember, Message
from app.models.user import User
from app.schemas.message import ChatRoomResponse, MessageCreate, MessageResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/rooms", response_model=list[ChatRoomResponse])
async def list_message_rooms(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ChatRoomResponse]:
    """현재 사용자가 참여한 채팅방 목록 반환."""
    # 현재 사용자가 속한 ChatRoomMember 행을 통해 채팅방 조회
    member_result = await db.execute(
        select(ChatRoomMember).where(ChatRoomMember.user_id == current_user.id)
    )
    memberships = member_result.scalars().all()
    room_ids = [m.room_id for m in memberships]

    if not room_ids:
        return []

    rooms_result = await db.execute(
        select(ChatRoom).where(ChatRoom.id.in_(room_ids)).order_by(ChatRoom.created_at.desc())
    )
    rooms = rooms_result.scalars().all()

    response_list: list[ChatRoomResponse] = []
    for room in rooms:
        # 각 방의 마지막 메시지 조회
        last_msg_result = await db.execute(
            select(Message)
            .where(Message.room_id == room.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_msg = last_msg_result.scalar_one_or_none()
        response_list.append(
            ChatRoomResponse(
                id=room.id,
                type=room.type,
                name=room.name,
                created_at=room.created_at,
                last_message=MessageResponse.model_validate(last_msg) if last_msg else None,
            )
        )
    return response_list


@router.get("/{room_id}", response_model=dict)
async def list_messages(
    room_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
) -> dict:
    """채팅방 메시지 목록."""
    # 방 접근 권한 확인
    member_result = await db.execute(
        select(ChatRoomMember).where(
            ChatRoomMember.room_id == room_id,
            ChatRoomMember.user_id == current_user.id,
        )
    )
    if member_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="채팅방 접근 권한이 없습니다.")

    result = await db.execute(
        select(Message)
        .where(Message.room_id == room_id)
        .order_by(Message.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    messages = result.scalars().all()
    return {
        "success": True,
        "data": [_to_response(m) for m in reversed(messages)],
    }


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def send_message(
    body: MessageCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """메시지 전송."""
    # 방 접근 권한 확인
    member_result = await db.execute(
        select(ChatRoomMember).where(
            ChatRoomMember.room_id == body.room_id,
            ChatRoomMember.user_id == current_user.id,
        )
    )
    if member_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="채팅방 접근 권한이 없습니다.")

    message = Message(
        room_id=body.room_id,
        sender_id=current_user.id,
        content=body.content,
    )
    db.add(message)
    await db.flush()
    return {"success": True, "data": _to_response(message)}


# ── helpers ──────────────────────────────────────────────────────────────────

def _to_response(message: Message) -> dict:
    return {
        "id": str(message.id),
        "room_id": str(message.room_id),
        "sender_id": str(message.sender_id),
        "content": message.content,
        "created_at": message.created_at.isoformat(),
    }
