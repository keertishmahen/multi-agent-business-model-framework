"""Tests for specialist reliability: JSON mode, retry, and honest degradation.

These cover the defect where every specialist silently returned a single blob of
raw, truncated JSON at 0.3 confidence instead of structured insights.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.agents import specialists  # noqa: E402
from app.agents.orchestrator import STEP_AGENT_MAP  # noqa: E402
from app.agents.specialists import SPECIALISTS, analyze  # noqa: E402

VALID = {"insights": ["a real insight"], "confidence": 0.9, "sources": [], "warnings": []}

ARGS = dict(prompt="p", rag_context={}, user_story="s", step_id="bmc")


class TestJsonModeRequested:
    """The model must be *told* to return JSON, not merely asked in prose."""

    @pytest.mark.asyncio
    async def test_specialists_request_json_mode_and_no_thinking(self, monkeypatch):
        captured = {}

        async def fake_generate(prompt, **kwargs):
            captured.update(kwargs)
            import json

            return json.dumps(VALID)

        monkeypatch.setattr(specialists, "generate_text", fake_generate)
        await analyze("market", **ARGS)

        assert captured["json_mode"] is True
        # Thinking tokens come out of the same budget as the answer; with 2048
        # and thinking on, ~1050 went to thinking and the JSON was truncated.
        assert captured["disable_thinking"] is True
        assert captured["max_output_tokens"] >= 4096


class TestRetry:
    @pytest.mark.asyncio
    async def test_retries_once_then_succeeds(self, monkeypatch):
        calls = {"n": 0}

        async def flaky(prompt, **kwargs):
            calls["n"] += 1
            if calls["n"] == 1:
                return "not json at all"
            import json

            return json.dumps(VALID)

        monkeypatch.setattr(specialists, "generate_text", flaky)
        result = await analyze("sdg", **ARGS)

        assert calls["n"] == 2
        assert result["failed"] is False
        assert result["insights"] == ["a real insight"]
        assert result["confidence"] == 0.9

    @pytest.mark.asyncio
    async def test_gives_up_after_two_attempts(self, monkeypatch):
        calls = {"n": 0}

        async def never_json(prompt, **kwargs):
            calls["n"] += 1
            return "still not json"

        monkeypatch.setattr(specialists, "generate_text", never_json)
        result = await analyze("financial", **ARGS)

        assert calls["n"] == 2
        assert result["failed"] is True

    @pytest.mark.asyncio
    async def test_retries_after_an_exception(self, monkeypatch):
        calls = {"n": 0}

        async def throws_once(prompt, **kwargs):
            calls["n"] += 1
            if calls["n"] == 1:
                raise RuntimeError("transient upstream error")
            import json

            return json.dumps(VALID)

        monkeypatch.setattr(specialists, "generate_text", throws_once)
        result = await analyze("critique", **ARGS)

        assert calls["n"] == 2
        assert result["failed"] is False


class TestHonestDegradation:
    """An unparseable answer must not masquerade as a low-confidence success."""

    @pytest.mark.asyncio
    async def test_raw_text_is_not_passed_off_as_an_insight(self, monkeypatch):
        truncated = '{"insights": ["The Total Addressable Market is estimated at'

        async def truncated_json(prompt, **kwargs):
            return truncated

        monkeypatch.setattr(specialists, "generate_text", truncated_json)
        result = await analyze("market", **ARGS)

        assert result["failed"] is True
        # The old behaviour dumped the raw body in as insights[0] at 0.3.
        assert result["insights"] == []
        assert result["confidence"] == 0
        assert not any(truncated in w for w in result["warnings"])

    @pytest.mark.asyncio
    async def test_unknown_agent_degrades_without_calling_the_model(self, monkeypatch):
        async def boom(prompt, **kwargs):
            raise AssertionError("should not be called")

        monkeypatch.setattr(specialists, "generate_text", boom)
        result = await analyze("nonexistent", **ARGS)
        assert result["failed"] is True


class TestOrchestrationBreadth:
    def test_every_generating_step_runs_all_four_specialists(self):
        assert set(STEP_AGENT_MAP) == {
            "focus",
            "issues",
            "tensions",
            "dilemmas",
            "values",
            "swot",
            "bmc",
            "plan",
        }
        for step, agents in STEP_AGENT_MAP.items():
            enabled = {a for a, on in agents.items() if on}
            assert enabled == set(SPECIALISTS), f"{step} does not run every specialist"

    def test_step_maps_are_independent_objects(self):
        # They are built from a shared dict; mutating one must not affect another.
        STEP_AGENT_MAP["focus"]["market"] = False
        try:
            assert STEP_AGENT_MAP["plan"]["market"] is True
        finally:
            STEP_AGENT_MAP["focus"]["market"] = True
