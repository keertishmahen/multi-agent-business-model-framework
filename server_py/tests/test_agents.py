"""Unit tests for output normalisation, conflict detection and RAG plumbing.

Mirrors server/agents/__tests__/agents.test.js. No network: anything that would
call Gemini is stubbed.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.agents.base import (  # noqa: E402
    create_fallback_result,
    normalize_agent_item,
    normalize_agent_output,
    validate_agent_output,
)
from app.agents.orchestrator import STEP_AGENT_MAP, should_use_mia  # noqa: E402
from app.agents.quality import detect_conflicts  # noqa: E402
from app.agents.specialists import SPECIALISTS, build_agent_prompt, filter_rag_context  # noqa: E402
from app.services.chroma_store import _to_where  # noqa: E402
from app.services.gemini_client import parse_json_response  # noqa: E402
from app.services.rag_service import format_plan_rag_context  # noqa: E402


# ── normalize_agent_item ──────────────────────────────────────────


class TestNormalizeAgentItem:
    def test_passes_through_strings(self):
        assert normalize_agent_item("  hello  ") == "hello"

    def test_renders_numbers_and_booleans(self):
        assert normalize_agent_item(42) == "42"
        assert normalize_agent_item(True) == "true"

    def test_none_becomes_empty(self):
        assert normalize_agent_item(None) == ""

    def test_unpacks_sdg_greenwashing_flag(self):
        item = {
            "type": "greenwashing",
            "flag": "HIGH",
            "explanation": "Claims lack measurable data",
            "impact_metrics_recommendation": "Track kg waste avoided",
        }
        result = normalize_agent_item(item)
        assert "[greenwashing]" in result
        assert "HIGH" in result
        assert "Claims lack measurable data" in result
        assert "Metrics: Track kg waste avoided" in result

    def test_falls_back_to_common_text_keys(self):
        assert normalize_agent_item({"text": "from text"}) == "from text"
        assert normalize_agent_item({"description": "from description"}) == "from description"

    def test_unknown_object_becomes_json_not_object_object(self):
        result = normalize_agent_item({"weird": "shape"})
        assert result.startswith("{")
        assert "[object" not in result


# ── normalize_agent_output ────────────────────────────────────────


class TestNormalizeAgentOutput:
    def test_produces_the_contract_the_frontend_reads(self):
        out = normalize_agent_output({"insights": ["a"], "confidence": 0.8}, "market")
        assert set(out) == {"agentId", "insights", "warnings", "sources", "confidence", "failed"}
        assert out["agentId"] == "market"
        assert out["failed"] is False

    def test_confidence_is_a_number_clamped_to_unit_range(self):
        assert normalize_agent_output({"confidence": 5}, "x")["confidence"] == 1.0
        assert normalize_agent_output({"confidence": -2}, "x")["confidence"] == 0.0
        # Missing or non-numeric confidence defaults to 0.5, never a string.
        assert normalize_agent_output({}, "x")["confidence"] == 0.5
        assert normalize_agent_output({"confidence": "high"}, "x")["confidence"] == 0.5

    def test_booleans_are_not_treated_as_numeric_confidence(self):
        assert normalize_agent_output({"confidence": True}, "x")["confidence"] == 0.5

    @pytest.mark.parametrize("alias", ["findings", "tensions", "dilemmas", "observations"])
    def test_recovers_insights_from_aliases(self, alias):
        out = normalize_agent_output({alias: ["recovered"]}, "critique")
        assert out["insights"] == ["recovered"]

    def test_promotes_prose_when_no_array_was_returned(self):
        out = normalize_agent_output({"summary": "just prose"}, "sdg")
        assert out["insights"] == ["just prose"]

    def test_flattens_nested_objects_inside_arrays(self):
        out = normalize_agent_output({"warnings": [{"text": "nested"}]}, "sdg")
        assert out["warnings"] == ["nested"]

    def test_non_dict_input_does_not_raise(self):
        assert normalize_agent_output("not a dict", "x")["insights"] == []


class TestValidateAgentOutput:
    def test_flags_nested_objects(self):
        result = validate_agent_output({"insights": [{"a": 1}]}, "x")
        assert not result["valid"]
        assert any("nested objects" in e for e in result["errors"])

    def test_clean_output_is_valid(self):
        assert validate_agent_output({"insights": ["fine"]}, "x")["valid"]


class TestFallbackResult:
    def test_marks_failure_and_keeps_shape(self):
        out = create_fallback_result("market", "timed out")
        assert out["failed"] is True
        assert out["confidence"] == 0
        assert out["insights"] == []
        assert "timed out" in out["warnings"][0]


# ── JSON extraction ───────────────────────────────────────────────


class TestParseJsonResponse:
    def test_plain_json(self):
        assert parse_json_response('{"a": 1}') == {"a": 1}

    def test_strips_markdown_fences(self):
        assert parse_json_response('```json\n{"a": 1}\n```') == {"a": 1}

    def test_extracts_json_after_a_preamble(self):
        assert parse_json_response('Here you go:\n{"a": 1}') == {"a": 1}

    def test_handles_arrays(self):
        assert parse_json_response("[1, 2]") == [1, 2]

    def test_returns_none_for_unparseable(self):
        assert parse_json_response("no json at all") is None
        assert parse_json_response("") is None


# ── Specialists ───────────────────────────────────────────────────


class TestSpecialists:
    def test_all_four_are_registered(self):
        assert set(SPECIALISTS) == {"market", "financial", "sdg", "critique"}

    def test_filter_falls_back_when_nothing_matches(self):
        ctx = {"knowledge": [{"source": "industry_patterns", "text": "t"}], "userHistory": []}
        # Asking for a collection that is not present must not blind the agent.
        assert filter_rag_context(ctx, ["sdg_knowledge"])["knowledge"] == ctx["knowledge"]

    def test_filter_narrows_when_matches_exist(self):
        ctx = {
            "knowledge": [
                {"source": "industry_patterns", "text": "keep"},
                {"source": "sdg_knowledge", "text": "drop"},
            ],
            "userHistory": [],
        }
        out = filter_rag_context(ctx, ["industry_patterns"])
        assert [k["text"] for k in out["knowledge"]] == ["keep"]

    def test_prompt_includes_every_required_section(self):
        prompt = build_agent_prompt(
            role="R",
            task="T",
            rag_context={
                "knowledge": [{"source": "s", "text": "k"}],
                "userHistory": [{"step": "focus", "text": "h"}],
            },
            user_story="story",
            step_id="bmc",
        )
        for header in (
            "=== GROUNDING KNOWLEDGE ===",
            "=== PREVIOUS STEP OUTPUTS ===",
            "=== USER'S BUSINESS STORY ===",
            "=== WORKFLOW STEP ===",
            "=== YOUR ROLE ===",
            "=== TASK ===",
            "=== REQUIRED OUTPUT FORMAT ===",
        ):
            assert header in prompt

    def test_prompt_omits_empty_sections(self):
        prompt = build_agent_prompt(
            role="R", task="T", rag_context={}, user_story="", step_id="story"
        )
        assert "=== GROUNDING KNOWLEDGE ===" not in prompt
        assert "=== USER'S BUSINESS STORY ===" not in prompt


# ── Orchestrator wiring ───────────────────────────────────────────


class TestStepAgentMap:
    def test_plan_and_bmc_run_the_full_panel(self):
        for step in ("bmc", "plan"):
            assert set(STEP_AGENT_MAP[step]) == {"market", "financial", "sdg", "critique"}

    def test_story_has_no_specialist_panel(self):
        assert not should_use_mia("story")

    def test_every_mapped_agent_actually_exists(self):
        for step, agents in STEP_AGENT_MAP.items():
            for agent_id in agents:
                assert agent_id in SPECIALISTS, f"{step} references unknown agent {agent_id}"


class TestDetectConflicts:
    def test_no_conflicts_when_no_warnings(self):
        specialists = {
            "market": {"warnings": [], "confidence": 0.9, "insights": []},
            "sdg": {"warnings": [], "confidence": 0.8, "insights": []},
        }
        assert detect_conflicts(specialists) == []

    def test_warning_against_a_confident_peer_is_a_conflict(self):
        specialists = {
            "sdg": {"warnings": ["Greenwashing risk"], "confidence": 0.6, "insights": []},
            "market": {"warnings": [], "confidence": 0.9, "insights": []},
        }
        conflicts = detect_conflicts(specialists)
        assert len(conflicts) == 1
        assert conflicts[0]["issue"] == "Greenwashing risk"

    def test_failed_agents_are_ignored(self):
        specialists = {
            "sdg": {"warnings": ["x"], "confidence": 0.6, "insights": [], "failed": True},
            "market": {"warnings": [], "confidence": 0.9, "insights": []},
        }
        assert detect_conflicts(specialists) == []

    def test_duplicate_issues_are_collapsed(self):
        specialists = {
            "sdg": {"warnings": ["same"], "confidence": 0.5, "insights": []},
            "critique": {"warnings": ["same"], "confidence": 0.5, "insights": []},
            "market": {"warnings": [], "confidence": 0.9, "insights": []},
        }
        assert len(detect_conflicts(specialists)) == 1


# ── Chroma where-clause building ──────────────────────────────────


class TestWhereClause:
    def test_none_for_empty(self):
        assert _to_where(None) is None
        assert _to_where({}) is None

    def test_single_field_is_a_bare_eq(self):
        assert _to_where({"sessionId": "s1"}) == {"sessionId": {"$eq": "s1"}}

    def test_multiple_fields_are_anded(self):
        where = _to_where({"sessionId": "s1", "stepId": "bmc"})
        assert "$and" in where
        assert len(where["$and"]) == 2

    def test_in_suffix_becomes_an_in_clause(self):
        # This convention is what lets the plan step pull all prior steps at once.
        assert _to_where({"stepIdIn": ["swot", "values"]}) == {
            "stepId": {"$in": ["swot", "values"]}
        }


# ── Plan RAG formatting ───────────────────────────────────────────


class TestFormatPlanRagContext:
    def test_bmc_is_labelled_as_source_of_truth_and_comes_first(self):
        text = format_plan_rag_context(
            {
                "bmcBlocks": [{"label": "value propositions", "text": "VP text"}],
                "priorSteps": [{"step": "swot", "text": "SWOT text"}],
                "knowledge": [{"source": "business_plan_sections", "text": "guidance", "relevance": 0.9}],
            }
        )
        assert text.index("SOURCE OF TRUTH") < text.index("PRIOR WORKFLOW STEPS")
        assert "do not contradict" in text
        assert "VP text" in text

    def test_knowledge_is_ordered_by_relevance(self):
        text = format_plan_rag_context(
            {
                "knowledge": [
                    {"source": "a", "text": "less", "relevance": 0.1},
                    {"source": "b", "text": "more", "relevance": 0.9},
                ]
            }
        )
        assert text.index("more") < text.index("less")

    def test_empty_context_is_empty_string(self):
        assert format_plan_rag_context({}) == ""
