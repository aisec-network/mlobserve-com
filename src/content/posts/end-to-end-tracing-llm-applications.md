---
title: "End-to-End Tracing for LLM Applications: What Belongs in a Span"
description: "Production LLM apps span multiple model calls, tool invocations, retrieval steps, and re-tries. A complete trace makes them debuggable; a sparse one leaves you guessing."
pubDate: 2026-05-07
author: "Priya Anand"
tags: ["observability", "tracing", "opentelemetry", "llm-ops", "debugging"]
category: "ops"
sources:
  - title: "OpenLLMetry"
    url: "https://github.com/traceloop/openllmetry"
  - title: "OpenTelemetry GenAI Semantic Conventions"
    url: "https://github.com/open-telemetry/semantic-conventions/tree/main/docs/gen-ai"
  - title: "Phoenix (Arize)"
    url: "https://docs.arize.com/phoenix/"
schema:
  type: "TechArticle"
heroImage: https://aisec-imagegen.th3gptoperator.workers.dev/?prompt=clean%20engineering%20trace%20visualization%20with%20spans%20and%20timing%20waterfall&aspect=hero
heroAlt: "End-to-end LLM trace waterfall"
---

A user clicks a button. Three seconds later they get an answer. In between: 4 model calls, 2 vector-store retrievals, 1 web fetch, 1 re-rank step, 2 retries, and a structured-output validation. If you can see all of that as a unified trace, you can debug latency, cost, or correctness regressions in 5 minutes. If you can only see the final response, you cannot.

This is the structure of a complete LLM trace and what to put in each span.

## The waterfall

A typical RAG-with-tool-use request decomposes into spans like:

```
[parent: handle_request]
  ├─ [retrieve_context]
  │   ├─ [embed_query]
  │   └─ [vector_search]
  ├─ [first_pass_llm]   <- planning step
  ├─ [tool_call: search_docs]
  │   └─ [http_request]
  ├─ [second_pass_llm]  <- synthesis step
  └─ [validate_output]
```

Each child span is a measurable unit: latency, cost, error class. The parent's latency is the sum of child latencies plus orchestration overhead (which itself should be a span if non-trivial).

## What belongs in an LLM span

A complete LLM-call span at minimum:

- `gen_ai.system`: provider name (anthropic, openai, vertex, bedrock, openrouter)
- `gen_ai.request.model`: requested model identifier
- `gen_ai.response.model`: actually-used model (some providers route)
- `gen_ai.operation.name`: chat | completion | embedding | tool_use
- `gen_ai.usage.prompt_tokens`: input tokens
- `gen_ai.usage.completion_tokens`: output tokens
- `gen_ai.usage.cost_usd`: computed cost (don't trust provider billing for real-time)
- `gen_ai.request.temperature`, `gen_ai.request.top_p`: sampling params
- `gen_ai.response.finish_reason`: stop | length | tool_calls | content_filter
- `gen_ai.response.id`: provider-side id for support tickets

The OpenTelemetry [GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions/tree/main/docs/gen-ai) standardize most of these. Use the conventions; vendor-specific names are technical debt.

For privacy, two attributes need careful handling:

- `gen_ai.prompt`: the input. Too sensitive for default capture in production. Either disable, hash, or sample at low rate.
- `gen_ai.completion`: the output. Same.

A reasonable default: capture both at 1% sample rate in production, full capture in staging. Override per-feature based on data-class.

## What belongs in a tool-call span

When the model calls a tool, capture:

- Tool name
- Argument hash (full args at low sample rate; hash at full rate to detect duplicates)
- Tool latency (separate from network latency if the tool wraps an HTTP call)
- Tool error class (validation failure, downstream service error, rate limit, timeout)
- Whether the tool's response was used in the final output (sometimes the model ignores tool output)

The "ignored tool output" attribute is one of the most useful debugging signals. If a tool fires but its output never appears in the response, either the prompt isn't using the result, or the model is hallucinating around it. Both are bugs worth catching.

## What belongs in a retrieval span

For RAG retrievals:

- Query text (sample-able)
- Number of results returned
- Latency split: embedding vs vector-search vs re-rank
- Similarity scores at the top-k boundary (the marginal kth-result score is the signal you tune cutoffs against)
- Cache hit/miss
- Index version (when did we last re-embed)

If your retrieval system has a tiered cache, capture the tier each result came from. This is where most retrieval-latency regressions hide.

## What does NOT belong in a span

- Full prompts and completions at default sampling rates (privacy + storage cost)
- Vector-space embeddings as serialized arrays (huge, low-signal)
- Internal prompt-rendering details that don't affect output (e.g., template-engine intermediate state)
- Reasoning traces from chain-of-thought models if you don't expose them to users (they're useful for debugging but enormous; sample at <1%)
- Anything that would let an attacker reconstruct the system prompt from your traces

## Cardinality discipline

OpenTelemetry traces are stored in a backend with tag cardinality limits. High-cardinality attributes (raw user IDs, free-text titles, full URLs with query strings) blow up your bill or your backend.

Strategies:

- **Hash high-cardinality strings**: capture `user_id_hash` instead of `user_id`. Salted; rotation-aware.
- **Bucket numeric values**: instead of capturing exact `latency_ms`, bucket into `latency_class: fast|medium|slow|verylow`.
- **Use semantic equivalents**: `feature_id` instead of feature URL; `provider` instead of full endpoint.
- **Prune URL query strings** before capture; keep the path and a hash of the params if you need replay.

Without cardinality discipline, your trace backend's monthly bill outpaces your AI compute spend within a few months.

## Sampling

For production at scale, you cannot trace 100% of requests. Reasonable sampling:

- 100% of error requests (decide at end-of-trace)
- 10% baseline of successful requests
- 100% of slow requests (anything > p95 latency)
- 100% of high-cost requests (anything in top decile of cost-per-request)
- Per-feature override for newly deployed features (100% for first 24h, then drop)

This requires "tail-based sampling" — the sampling decision is made after the trace completes. Most managed observability vendors support it; if you self-host, [OpenTelemetry Collector's tail-sampling processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor) is the standard option.

## Attribute propagation

Across service boundaries (your app → vector store → tool service → external API), trace context must propagate via the `traceparent` HTTP header (W3C Trace Context). Most language SDKs do this automatically; verify in your stack.

When trace context is dropped, you get fragmented traces — the parent span shows in your backend, but the child doesn't link. Debugging across the gap requires manual ID-stitching, which is error-prone.

## Tooling

[OpenLLMetry](https://github.com/traceloop/openllmetry) for instrumentation; vendor-neutral, instruments most LLM SDKs. Sends to any OTel-compatible backend.

[Phoenix (Arize)](https://docs.arize.com/phoenix/) as backend if you want LLM-specific UI; runs locally or as a service. Strong on trace exploration.

[Helicone](https://www.helicone.ai/) as a LLM-specific gateway-and-observability product. Open-source self-hosted available.

[LangSmith](https://docs.smith.langchain.com/) if you're already in the LangChain ecosystem; otherwise OTel + Phoenix is a more portable stack.

## What the trace lets you do

Once instrumented, common debugging questions become 5-minute trace queries:

- "Why was this user's request slow?" → load trace, look at the waterfall, identify the long span
- "Why did this feature's cost double?" → compare last week's traces to this week's, look at average tokens per call
- "Why did the model call the wrong tool?" → load the trace, look at the span where the tool call decision was made, inspect input
- "Why did the response contain stale data?" → trace shows retrieval span; check cache hit + index version

Without traces: spend 2 hours theorizing. With traces: see the answer immediately.

## What to instrument first

If you're starting from zero, instrumentation order:

1. The outermost request boundary (handle_request span)
2. Each LLM call (with the conventions above)
3. Each tool call
4. Each retrieval
5. Errors (caught exceptions become span events)
6. Cache lookups (separate span, even if cheap)
7. Output validation / classification

You can ship #1-3 in a day with OpenLLMetry. The remaining items roll out over a sprint. Within two weeks you have full coverage and the debugging-time payback starts immediately.

## Cross-references

For cost observability specifically, see [llmops.report on token-cost observability](https://llmops.report/token-cost-observability-production/). For drift detection with the same trace data, [mlmonitoring.report on silent quality decay](https://mlmonitoring.report/silent-quality-decay-llm-production/). For the security side of trace data (what NOT to log), see [guardml.io on output classification](https://guardml.io/output-classification-pii-secrets-detector/).

The traces are the foundation; everything else builds on them.
