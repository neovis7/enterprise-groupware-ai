# models package — import all models so Alembic can detect them
from app.models.user import User
from app.models.department import Department
from app.models.approval import Approval, ApprovalLine, ApprovalHistory
from app.models.schedule import Schedule, ScheduleAttendee
from app.models.post import Post, PostDepartment, PostRead
from app.models.message import ChatRoom, ChatRoomMember, Message
from app.models.notification import Notification
from app.models.attendance import AttendanceRecord, LeaveRequest
from app.models.file import Folder, FileItem
from app.models.project import Project, ProjectMember, Task
from app.models.ai_session import AISession, AIMessage
from app.models.audit_log import AuditLog

__all__ = [
    "User", "Department",
    "Approval", "ApprovalLine", "ApprovalHistory",
    "Schedule", "ScheduleAttendee",
    "Post", "PostDepartment", "PostRead",
    "ChatRoom", "ChatRoomMember", "Message",
    "Notification",
    "AttendanceRecord", "LeaveRequest",
    "Folder", "FileItem",
    "Project", "ProjectMember", "Task",
    "AISession", "AIMessage",
    "AuditLog",
]
