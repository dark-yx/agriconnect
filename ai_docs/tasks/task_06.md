# Bolt.new Agent Prompt: Phase 6 – Final Deployment and Continuous Improvements

## Prompt

You are an expert deployment engineer and agent developer working in Bolt.new. Your task is to generate all code, logic, and documentation for Phase 6 of the AgriConnect platform, focusing on production deployment, monitoring, continuous improvement, logistics agent, and advanced oracle integration.

**Instructions:**

1. **Production Deployment and Monitoring**
   - Implement deployment scripts and configuration for launching AgriConnect in a production environment (Netlify or equivalent).
   - Set up monitoring for uptime, error tracking, and analytics.
   - Ensure the "Built with Bolt.new" badge is visible in the public app.
   - Output all deployment and monitoring code/configuration.

2. **Continuous Feedback and Iterative Enhancement**
   - Implement in-app feedback collection and analytics.
   - Design a process for collecting, analyzing, and acting on user feedback.
   - Output code and documentation for feedback and improvement loops.

3. **Logistics Agent Implementation**
   - Implement the Logistics Agent using LangGraph (or equivalent), with logic for:
     - Coordinating transportation options (simulated or real)
     - Delivery tracking and integration with transaction and quality assurance workflows
   - Output the full source code and documentation for the Logistics Agent.

4. **Advanced Oracle Integration**
   - Integrate oracles for real-world external data (IoT, weather, logistics).
   - Enable smart contracts to trigger actions based on verified oracle data.
   - Output all oracle integration code and documentation.

5. **Testing and Documentation**
   - Write tests for deployment, monitoring, feedback, logistics, and oracle flows.
   - Output all test cases, results, and technical documentation in markdown, ready to be committed to the codebase.

**Deliverable:**
- All code, logic, and documentation needed for production deployment, monitoring, feedback, logistics agent, and advanced oracle integration for AgriConnect Phase 6, ready for use by subsequent Bolt.new agent development prompts. 

---

**Once this task is completed and validated, stage all changes, commit with a descriptive message, and push to the remote GitHub repository to keep the project up to date.**

**Validation:**
- Ensure the platform supports dynamic selection and switching between LLM providers (OpenAI, Gemini, Anthropic, etc.) at runtime, with no changes required to application logic. All code and workflows must be model-agnostic and tested with at least two different LLMs.
- Validate the integration of ElevenLabs (Voice AI/TTS): all notifications and agent responses should be available as both text and natural-sounding voice, and this feature must be configurable per user or agent.

--- 