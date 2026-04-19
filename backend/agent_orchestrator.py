from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional

from agents.critic_agent import review_grounded_answer
from agents.router_agent import route_message
from source_memory import ensure_sources, retrieve_relevant_sources


def run_chat_orchestration(
    *,
    twin_data: Optional[dict],
    user_message: str,
    conversation: List[Dict[str, Any]],
    responder: Callable[[List[Dict[str, Any]], str, Optional[dict], Optional[str], Optional[str], str, Optional[List[dict]], Optional[List[dict]], str], str],
    personality_model: Optional[dict],
    twin_name: Optional[str],
    twin_title: Optional[str],
    response_style: str,
    corrections: Optional[List[dict]],
) -> Dict[str, Any]:
    """Coordinate router, retrieval, responder, and critic for chat."""
    route = route_message(user_message, conversation)
    sources = ensure_sources(twin_data) if twin_data else []
    retrieved_sources = (
        retrieve_relevant_sources(
            user_message,
            sources,
            limit=int(route.get("retrieval_limit", 3)),
        )
        if twin_data
        else []
    )

    answer = responder(
        conversation,
        user_message,
        personality_model,
        twin_name,
        twin_title,
        response_style,
        corrections,
        retrieved_sources,
        str(route["query_type"]),
    )

    critic = (
        review_grounded_answer(
            user_message=user_message,
            answer=answer,
            query_type=str(route["query_type"]),
            retrieved_sources=retrieved_sources,
        )
        if twin_data
        else {"grounding": None, "critic_notes": [], "critic_passed": True, "answer": answer}
    )

    return {
        "answer": critic["answer"],
        "route": route,
        "grounding": critic["grounding"],
        "critic_notes": critic["critic_notes"],
        "critic_passed": critic["critic_passed"],
        "retrieved_sources": retrieved_sources,
    }
