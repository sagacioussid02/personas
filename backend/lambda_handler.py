import asyncio

from mangum import Mangum
from server import app, run_research_agent_batch

_http_handler = Mangum(app)


def handler(event, context):
    """EventBridge Scheduler invokes this Lambda directly (not through API
    Gateway) with a plain JSON payload to trigger the twice-monthly research
    agent batch — {"task": "run_research_agent_batch"}. Any other event
    (API Gateway HTTP requests, which never have a "task" key) falls through
    to the normal Mangum/FastAPI path unchanged."""
    if isinstance(event, dict) and event.get("task") == "run_research_agent_batch":
        return asyncio.run(run_research_agent_batch())
    return _http_handler(event, context)