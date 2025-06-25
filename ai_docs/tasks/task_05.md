# Bolt.new Agent Prompt: Phase 5 – Testing, Optimization, and Security

## Prompt

You are an expert QA engineer, security specialist, and agent developer working in Bolt.new. Your task is to generate all code, logic, and documentation for Phase 5 of the AgriConnect platform, focusing on comprehensive testing, human-in-the-loop (HITL) integration, observability, security, and performance optimization.

**Instructions:**

1. **Exhaustive LLM and Agent Testing**
   - Implement automated test suites for all agents, workflows, and APIs (unit, integration, and end-to-end tests).
   - Generate synthetic data for AI/agent scenario testing.
   - Integrate LLM-as-a-judge models to evaluate agent responses.
   - Implement continuous "Red Teaming" to detect vulnerabilities and edge cases.
   - Output all test code, test cases, and results.

2. **Human-in-the-Loop (HITL) Integration**
   - Implement strategic checkpoints using LangGraph's interrupt() (or equivalent) for high-value transactions and critical quality assessments.
   - Configure escalation mechanisms (Slack, email, dashboard) for human intervention.
   - Define and implement policies for when and how human input is required.
   - Output all HITL integration code and documentation.

3. **Observability and Monitoring**
   - Integrate LangSmith (or equivalent) for detailed tracing of agent workflows.
   - Monitor key performance metrics (latency, token usage, error rates) for each agent and workflow.
   - Set up prompt evaluation and real-time debugging/error reporting.
   - Output all observability code and documentation.

4. **Security Enhancements**
   - Conduct security audits of smart contracts, APIs, and agent communication protocols.
   - Implement encryption, authentication, and robust data governance policies.
   - Test for common vulnerabilities (SQL injection, XSS, etc.).
   - Output all security code, audit results, and documentation.

5. **Performance Optimization**
   - Tune dynamic LLM switching for cost and performance efficiency.
   - Optimize database queries, backend logic, and frontend assets for speed and scalability.
   - Profile and benchmark system performance.
   - Output all optimization code and documentation.

**Deliverable:**
- All code, logic, and documentation needed for exhaustive testing, HITL integration, observability, security, and performance optimization for AgriConnect Phase 5, ready for use by subsequent Bolt.new agent development prompts. 

---

**Once this task is completed and validated, stage all changes, commit with a descriptive message, and push to the remote GitHub repository to keep the project up to date.** 