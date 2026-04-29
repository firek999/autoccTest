"""健康检查路由."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """健康检查端点，返回服务运行状态."""
    return {"status": "healthy"}
