// ===== AI CONFIGURATION & MODEL REGISTRY =====
// API key is intentionally NOT stored here.
// It lives in .env on the server and is proxied through /api/ai/chat.

const AI_MODELS = [
  // FAST SIGNAL LAYER
  { id: "stepfun-ai/step-3.5-flash",    layer: "Fast Signal",    role: "Real-time pre-filtering",   status: "active" },
  { id: "minimaxai/minimax-m2.7",        layer: "Fast Signal",    role: "Parallel analysis",          status: "active" },
  { id: "z-ai/glm4.7",                   layer: "Fast Signal",    role: "Indicator fetch",            status: "deprecating" },

  // DEEP ANALYSIS LAYER
  { id: "mistralai/mistral-large-3-675b-instruct-2512", layer: "Deep Analysis", role: "Main analysis",           status: "active" },
  { id: "mistralai/mistral-nemotron",    layer: "Deep Analysis",  role: "Function calling",           status: "active" },
  { id: "bytedance/seed-oss-36b-instruct", layer: "Deep Analysis", role: "Long-context reasoning",   status: "active" },

  // REASONING LAYER
  { id: "moonshotai/kimi-k2-thinking",   layer: "Reasoning",      role: "Deep thinking",             status: "deprecating" },
  { id: "mistralai/magistral-small-2506",layer: "Reasoning",      role: "Reasoning verification",    status: "deprecating" },

  // NEWS/SENTIMENT LAYER
  { id: "meta/llama-4-maverick-17b-128e-instruct", layer: "News/Sentiment", role: "International news",   status: "active" },
  { id: "google/gemma-3n-e4b-it",        layer: "News/Sentiment", role: "Earnings audio/text",       status: "active" },
  { id: "google/gemma-3n-e2b-it",        layer: "News/Sentiment", role: "Fast news feed",            status: "active" },
  { id: "mistralai/mistral-medium-3-instruct", layer: "News/Sentiment", role: "Enterprise analysis", status: "deprecating" },

  // CODE GEN LAYER
  { id: "qwen/qwen3-coder-480b-a35b-instruct", layer: "Code Gen", role: "Broker API / Backtesting",  status: "active" },
  { id: "moonshotai/kimi-k2-instruct",   layer: "Code Gen",       role: "Strategy logic",            status: "deprecating" },
  { id: "mistralai/devstral-2-123b-instruct-2512", layer: "Code Gen", role: "Code specialized",      status: "deprecating" },

  // RAG/EMBED LAYER
  { id: "nvidia/llama-3.2-nemoretriever-300m-embed-v1", layer: "RAG/Embed", role: "Pattern embedding", status: "active" },
  { id: "nvidia/llama-3.2-nv-embedqa-1b-v2", layer: "RAG/Embed", role: "Backup embedding",          status: "active" },

  // SAFETY LAYER
  { id: "nvidia/nemotron-content-safety-reasoning-4b", layer: "Safety", role: "Contextual safety",   status: "active" },
  { id: "nvidia/nemotron-3-content-safety", layer: "Safety",      role: "Multimodal safety",         status: "active" },
  { id: "nvidia/llama-3.1-nemotron-safety-guard-8b-v3", layer: "Safety", role: "Secondary safety",   status: "active" },
  { id: "meta/llama-guard-4-12b",        layer: "Safety",         role: "Final gate",                status: "active" },
];
