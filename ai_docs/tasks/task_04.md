# Bolt.new Agent Prompt: Phase 4 – AI and Data Optimization

## Prompt

You are an expert AI/ML engineer and agent developer working in Bolt.new. Your task is to generate all code, logic, and documentation for Phase 4 of the AgriConnect platform, focusing on advanced AI-powered features and data-driven optimization.

**Instructions:**

1. **Matching and Recommendation Engine**
   - Implement ML algorithms (e.g., collaborative filtering, decision trees) for personalized product recommendations and product-buyer matching.
   - Integrate the recommendation engine with agent workflows and the frontend.
   - Output all code, model definitions, and integration logic.

2. **Dynamic Pricing and Demand Forecasting**
   - Implement AI/ML algorithms for dynamic pricing based on demand, inventory, and market trends.
   - Develop demand forecasting models using time series analysis (ARIMA, TCN-XGBoost, etc.).
   - Integrate external data sources (weather, market trends) via oracles.
   - Output all code, model definitions, and integration logic.

3. **Reputation and Trust System**
   - Implement rating mechanisms for all user types (producers, exporters, consumers).
   - Store and update reputation scores in the database.
   - Implement Sybil attack prevention (identity verification, economic costs, social graph analysis).
   - Output all backend code and UI components for reputation and trust.

4. **Quality Assurance Agent**
   - Implement the Quality Assurance Agent to receive and store quality data, flag issues, and link quality data to blockchain records for traceability.
   - Integrate quality checks into transaction workflows.
   - Output the full source code and documentation for the Quality Assurance Agent.

5. **Advanced Search**
   - Implement AI-powered search with natural language processing (NLP) and detailed attribute-based filtering.
   - Integrate proactive suggestions and search result ranking.
   - Output all backend and frontend code for advanced search.

6. **Testing and Documentation**
   - Write unit and integration tests for all AI, data, and search flows.
   - Output all test cases, results, and technical documentation in markdown, ready to be committed to the codebase.

**Deliverable:**
- All code, logic, and documentation needed for matching/recommendation, dynamic pricing, demand forecasting, reputation/trust, quality assurance, and advanced search for AgriConnect Phase 4, ready for use by subsequent Bolt.new agent development prompts. 

---

**Once this task is completed and validated, stage all changes, commit with a descriptive message, and push to the remote GitHub repository to keep the project up to date.**

**Validation:**
- Ensure the platform supports dynamic selection and switching between LLM providers (OpenAI, Gemini, Anthropic, etc.) at runtime, with no changes required to application logic. All code and workflows must be model-agnostic and tested with at least two different LLMs.
- Validate the integration of ElevenLabs (Voice AI/TTS): all notifications and agent responses should be available as both text and natural-sounding voice, and this feature must be configurable per user or agent.

--- 