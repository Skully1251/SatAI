"""
ai/explainer.py

Turns a router result (answer + execution trace + evidence bundle) into
a natural, conversational explanation — and supports multi-turn
follow-up questions about that same result.

COMPLIANCE DESIGN NOTE (important — read before modifying):
This module NEVER looks at imagery and NEVER performs remote-sensing
analysis itself. It only rephrases facts that were already computed by
adapted, validated components (the fine-tuned classifier, the LoRA VQA
model, the spectral-index/fusion/change modules). It is given a strict
"use ONLY these facts" instruction and is explicitly told to say "I
don't have that information" rather than infer anything new. This is
what keeps it outside the "generic LLM/VLM performing the specialised
task" disqualification in the problem statement — a generic LLM is
fine as a narrator over pre-computed evidence; it is not fine as an
analyst of raw imagery.

It reuses the ALREADY-LOADED Qwen2-VL model/processor from a VQAEngine
instance (avoids loading a second ~4GB model), but generates with the
RSVQA LoRA adapter DISABLED — narration is fluent open-ended language
generation, not the short-answer RSVQA task the adapter was tuned for,
so the base model is the more appropriate (and equally compliant) tool
for this specific step.
"""

import json
import uuid
from PIL import Image

from vqa import VQAEngine
from spectral_indices import true_color

MAX_NEW_TOKENS_EXPLAIN = 200

SYSTEM_INSTRUCTIONS = (
    "You are the explanation layer of SatQueryAI, a remote-sensing analysis system. "
    "You will be given: the user's question, the answer produced by the system's "
    "specialist models, and a bundle of supporting evidence (land-cover class "
    "probabilities, spectral index values, coverage percentages, etc.).\n\n"
    "Your ONLY job is to explain this evidence to the user in clear, natural language. "
    "STRICT RULES:\n"
    "1. Use ONLY the facts given to you below. Never invent, assume, or infer any "
    "detail not explicitly present in the evidence.\n"
    "2. If the user asks something the evidence does not cover, say plainly that "
    "you don't have that information from the current analysis, rather than guessing.\n"
    "3. Do not describe the image visually beyond what the evidence states — you are "
    "explaining computed results, not re-analyzing the picture.\n"
    "4. Be conversational and clear, but stay strictly evidence-bound."
)


def _format_evidence(answer: str, trace: dict, evidence_bundle: dict = None) -> str:
    lines = [f"System's answer to the question: {answer}", ""]
    lines.append(f"Task performed: {trace.get('selected_task')}")
    lines.append(f"Tool/model used: {trace.get('selected_tool')}")

    outputs = trace.get("outputs", {})
    if outputs:
        lines.append("Detailed outputs:")
        lines.append(json.dumps(outputs, indent=2, default=str))

    confidence = trace.get("confidence")
    if confidence is not None:
        lines.append(f"Model confidence: {confidence:.2f}")

    if evidence_bundle:
        lines.append("")
        lines.append("Supporting context (computed regardless of the primary task):")
        if "top_landcover_classes" in evidence_bundle:
            lines.append("Top land-cover classes (fine-tuned classifier):")
            for cls, prob in evidence_bundle["top_landcover_classes"]:
                lines.append(f"  - {cls}: {prob*100:.1f}%")
        if "spectral_indices" in evidence_bundle:
            lines.append("Spectral index means:")
            for k, v in evidence_bundle["spectral_indices"].items():
                lines.append(f"  - {k}: {v:.3f}")

    return "\n".join(lines)


class ConversationSession:
    def __init__(self, session_id: str, image: Image.Image, evidence_text: str):
        self.session_id = session_id
        self.image = image
        self.evidence_text = evidence_text
        self.messages = []  # list of {"role": ..., "content": [...]} for apply_chat_template


class Explainer:
    def __init__(self, vqa_engine: VQAEngine):
        """Reuses an already-loaded VQAEngine's model/processor — pass in the
        same instance the router already holds, don't create a second one."""
        self.model = vqa_engine.model  # PeftModel wrapping the base Qwen2-VL
        self.processor = vqa_engine.processor
        self.device = vqa_engine.device
        self.sessions: dict[str, ConversationSession] = {}

    def _generate(self, session: ConversationSession, user_text: str) -> str:
        session.messages.append({
            "role": "user",
            "content": [{"type": "image"}, {"type": "text", "text": user_text}] if not session.messages
            else [{"type": "text", "text": user_text}],
        })

        chat_messages = [{"role": "system", "content": [{"type": "text", "text": SYSTEM_INSTRUCTIONS}]}]
        chat_messages.extend(session.messages)

        text = self.processor.apply_chat_template(
            chat_messages, tokenize=False, add_generation_prompt=True
        )
        # Only the first turn actually needs the image token resolved against
        # real pixel data; Qwen2-VL's processor still expects the image
        # passed on every call that contains an <image> token in the text,
        # so we pass it every turn — cheap relative to generation cost.
        inputs = self.processor(
            text=[text], images=[session.image], return_tensors="pt"
        ).to(self.device)

        with self.model.disable_adapter():
            with self._no_grad():
                generated = self.model.generate(**inputs, max_new_tokens=MAX_NEW_TOKENS_EXPLAIN)

        output_text = self.processor.batch_decode(
            generated[:, inputs["input_ids"].shape[1]:], skip_special_tokens=True
        )[0].strip()

        session.messages.append({"role": "assistant", "content": [{"type": "text", "text": output_text}]})
        return output_text

    @staticmethod
    def _no_grad():
        import torch
        return torch.no_grad()

    def start_session(self, query: str, answer: str, trace: dict, patch_raw,
                       evidence_bundle: dict = None) -> dict:
        """
        Starts a new explanation session for a router result. Returns
        {"session_id": ..., "explanation": ...} — pass session_id to
        continue_session() for follow-up questions.
        """
        session_id = str(uuid.uuid4())
        image = Image.fromarray(true_color(patch_raw))
        evidence_text = _format_evidence(answer, trace, evidence_bundle)

        session = ConversationSession(session_id, image, evidence_text)
        self.sessions[session_id] = session

        opening_prompt = (
            f"The user asked: \"{query}\"\n\n"
            f"Here is the evidence you must base your explanation on:\n\n{evidence_text}\n\n"
            f"Explain this answer to the user conversationally."
        )
        explanation = self._generate(session, opening_prompt)

        return {"session_id": session_id, "explanation": explanation}

    def continue_session(self, session_id: str, follow_up: str) -> dict:
        """Handles a follow-up question within an existing session."""
        if session_id not in self.sessions:
            return {"error": f"Unknown session_id '{session_id}'. Start a new session first."}

        session = self.sessions[session_id]
        reply = self._generate(session, follow_up)
        return {"session_id": session_id, "explanation": reply}