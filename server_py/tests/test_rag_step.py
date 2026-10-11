"""The standalone RAG step: BMC storage, plan retrieval, curation and MIA routing.

Uses a throwaway Chroma directory and a deterministic fake embedder, so no
network and no shared state with the real store.
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

import chromadb
import pytest
from chromadb.config import Settings

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.agents.specialists import SPECIALISTS, build_agent_prompt, filter_rag_context  # noqa: E402
from app.services import chroma_store as store  # noqa: E402
from app.services import rag_service  # noqa: E402

SESSION = "session_test_rag"

# The shape normalizeBmcOutput produces, sent as JSON.stringify(...) by the client.
BMC_OUTPUT = {
    "bmc": [
        {
            "value_proposition": "Refill stations for zero-waste cleaning products",
            "canvas": {bid: [f"{bid} item one", f"{bid} item two"] for bid in rag_service.BMC_BLOCK_IDS},
        }
    ]
}


def _fake_embedding(text: str) -> list[float]:
    vec = [0.0] * 8
    for i, ch in enumerate(text.encode("utf-8")):
        vec[i % 8] += ch
    norm = sum(v * v for v in vec) ** 0.5 or 1.0
    return [v / norm for v in vec]


@pytest.fixture(autouse=True)
def isolated_store(tmp_path, monkeypatch):
    client = chromadb.PersistentClient(
        path=str(tmp_path / "chroma"),
        settings=Settings(anonymized_telemetry=False, allow_reset=True),
    )
    monkeypatch.setattr(store, "_client", client)

    async def fake_embed(text: str) -> list[float]:
        return _fake_embedding(text)

    monkeypatch.setattr(rag_service, "generate_embedding", fake_embed)
    yield


def run(coro):
    return asyncio.run(coro)


def _session_docs(step_id: str) -> list[dict]:
    return store.query_by_metadata(
        store.Collections.USER_CONTEXT, {"sessionId": SESSION, "stepId": step_id}, limit=100
    )


class TestBmcStorage:
    def test_json_string_bmc_is_split_into_blocks(self):
        stored = run(rag_service.store_step_output(SESSION, "bmc", json.dumps(BMC_OUTPUT)))
        assert stored == len(rag_service.BMC_BLOCK_IDS)
        docs = _session_docs("bmc")
        assert {d["metadata"]["chunkType"] for d in docs} == {"bmc_block"}

    def test_camel_case_canvas_from_the_client_is_recognised(self):
        # canonicalizeCanvas in src/utils/bmcFormat.js keys the canvas in camelCase.
        camel = {
            "bmc": [
                {
                    "value_proposition": "x",
                    "canvas": {
                        "keyPartners": [{"id": "keyPartners-0", "text": "Council recycling depot"}],
                        "valuePropositions": ["Refills at half the price"],
                        "socialEnvironmentalBenefit": ["Less plastic"],
                    },
                }
            ]
        }
        stored = run(rag_service.store_step_output(SESSION, "bmc", json.dumps(camel)))
        assert stored == 3
        docs = {d["metadata"]["blockId"]: d["text"] for d in _session_docs("bmc")}
        assert set(docs) == {"key_partners", "value_propositions", "social_environmental_benefit"}
        assert "Council recycling depot" in docs["key_partners"]

    def test_regenerating_replaces_instead_of_duplicating(self):
        run(rag_service.store_step_output(SESSION, "bmc", json.dumps(BMC_OUTPUT)))
        run(rag_service.store_step_output(SESSION, "bmc", json.dumps(BMC_OUTPUT)))
        assert len(_session_docs("bmc")) == len(rag_service.BMC_BLOCK_IDS)

        run(rag_service.store_step_output(SESSION, "swot", json.dumps({"swot": ["a"]})))
        run(rag_service.store_step_output(SESSION, "swot", json.dumps({"swot": ["b"]})))
        docs = _session_docs("swot")
        assert len(docs) == 1
        assert '"b"' in docs[0]["text"]

    def test_emptied_block_is_removed(self):
        run(rag_service.store_step_output(SESSION, "bmc", json.dumps(BMC_OUTPUT)))
        smaller = json.loads(json.dumps(BMC_OUTPUT))
        smaller["bmc"][0]["canvas"]["channels"] = []
        run(rag_service.store_step_output(SESSION, "bmc", json.dumps(smaller)))
        block_ids = {d["metadata"]["blockId"] for d in _session_docs("bmc")}
        assert "channels" not in block_ids
        assert len(block_ids) == len(rag_service.BMC_BLOCK_IDS) - 1

    def test_step_output_keeps_all_fields(self):
        payload = {"title": "Focus", "drivers": ["cost of waste"], "goal": "cut plastic"}
        run(rag_service.store_step_output(SESSION, "focus", json.dumps(payload)))
        text = _session_docs("focus")[0]["text"]
        assert "cost of waste" in text and "cut plastic" in text


class TestPlanRetrieval:
    def test_plan_context_finds_every_block_and_prior_steps(self):
        run(rag_service.store_step_output(SESSION, "story", "We run refill stations."))
        run(rag_service.store_step_output(SESSION, "swot", json.dumps({"swot": ["x"]})))
        run(rag_service.store_step_output(SESSION, "bmc", json.dumps(BMC_OUTPUT)))

        ctx = run(rag_service.retrieve_plan_context(session_id=SESSION, prompt="plan"))
        report = ctx["coverageReport"]
        assert report["bmcBlocksRetrieved"] == len(rag_service.BMC_BLOCK_IDS)
        assert report["bmcComplete"] is True
        assert report["missingBmcBlocks"] == []
        assert {p["step"] for p in ctx["priorSteps"]} == {"story", "swot"}
        assert all(item.get("id") and item.get("kind") for item in ctx["bmcBlocks"] + ctx["priorSteps"])

    def test_missing_blocks_are_reported(self):
        ctx = run(rag_service.retrieve_plan_context(session_id=SESSION, prompt="plan"))
        assert ctx["coverageReport"]["bmcBlocksRetrieved"] == 0
        assert set(ctx["coverageReport"]["missingBmcBlocks"]) == set(rag_service.BMC_BLOCK_IDS)


CURATED = [
    {"kind": "bmc", "id": "b1", "blockId": "value_propositions", "text": "value propositions: CURATED-VP"},
    {"kind": "step", "id": "s1", "step": "swot", "text": "CURATED-SWOT"},
    {
        "kind": "knowledge",
        "id": "k1",
        "source": store.Collections.SDGS,
        "title": "SDG 12",
        "text": "CURATED-SDG12",
        "relevance": 0.8,
    },
]


class TestCuratedContextFeedsMia:
    def test_curated_context_replaces_live_retrieval(self):
        run(rag_service.store_step_output(SESSION, "bmc", json.dumps(BMC_OUTPUT)))
        ctx = run(
            rag_service.retrieve_context(
                "plan", "plan", SESSION, {"curatedContext": CURATED}
            )
        )
        assert [b["blockId"] for b in ctx["bmcBlocks"]] == ["value_propositions"]
        assert ctx["coverageReport"]["curated"] is True
        assert "CURATED-VP" in ctx["planRagText"]
        assert "CURATED-SWOT" in ctx["planRagText"]
        assert "CURATED-SDG12" in ctx["planRagText"]

    def test_every_specialist_prompt_gets_curated_bmc_and_steps(self):
        ctx = run(rag_service.retrieve_context("plan", "plan", SESSION, {"curatedContext": CURATED}))
        for agent_id, spec in SPECIALISTS.items():
            prompt = build_agent_prompt(
                role=spec.role if hasattr(spec, "role") else agent_id,
                task="t",
                rag_context=filter_rag_context(ctx, spec.collections),
                user_story="",
                step_id="plan",
            )
            assert "CURATED-VP" in prompt, agent_id
            assert "CURATED-SWOT" in prompt, agent_id

    def test_without_curation_plan_falls_back_to_live_retrieval(self):
        run(rag_service.store_step_output(SESSION, "bmc", json.dumps(BMC_OUTPUT)))
        ctx = run(rag_service.retrieve_context("plan", "plan", SESSION, {}))
        assert ctx["coverageReport"]["bmcBlocksRetrieved"] == len(rag_service.BMC_BLOCK_IDS)
        assert not ctx["coverageReport"].get("curated")


def test_agent_routing_matches_specialist_collections():
    routing = rag_service.agent_routing()
    assert set(SPECIALISTS) <= set(routing["bmc"])
    assert "sdg" in routing[store.Collections.SDGS]
    assert "financial" not in routing[store.Collections.SDGS]
    assert "fact-checker" in routing["step"]
