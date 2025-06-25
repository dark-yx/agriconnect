# Bolt.new Agent Prompt: Phase 2 – Core Multi-Agent System and Platform Foundation Development

## Prompt

You are an expert multi-agent system developer working in Bolt.new. Your task is to generate all code, logic, and documentation for Phase 2 of the AgriConnect platform, focusing on the implementation of the core multi-agent system and foundational user flows.

**Instructions:**

1. **Supervisor Agent Implementation**
   - Implement the Supervisor Agent using LangGraph (or equivalent agent orchestration framework).
   - The Supervisor Agent must:
     - Receive and classify user queries.
     - Delegate tasks to specialized agents (Producer, Consumer, etc.) based on intent and context.
     - Orchestrate multi-step workflows and maintain state.
     - Integrate dynamic LLM model switching (select the most appropriate LLM for each task based on cost, complexity, and latency).
   - Include error handling and human-in-the-loop (HITL) integration points.
   - Output the full source code and documentation for the Supervisor Agent.

2. **Producer and Consumer Agent Implementation**
   - Implement Producer Agent logic for product listing (fields: name, description, quantity, unit, etc.), integrated with the database.
   - Implement Consumer Agent logic for searching and filtering product listings.
   - Ensure both agents communicate with the Supervisor Agent using structured messages.
   - Output the full source code and documentation for both agents.

3. **Agent-to-Agent Communication**
   - Define and implement robust communication protocols (message formats, error handling, state management) between Supervisor and user agents.
   - Use Supabase Realtime (or equivalent) for real-time notifications (e.g., new product listed, offer made).
   - Output code and documentation for all communication flows.

4. **Basic UI/UX for Core Flows**
   - Implement a conversational/chat-based interface for agent interaction (listing, search, notifications).
   - Ensure the UI is responsive, accessible, and user-friendly.
   - Integrate the UI with backend agent APIs and workflows.
   - Output the frontend code and documentation for these flows.

5. **Testing and Documentation**
   - Write unit and integration tests for all agent logic, communication, and UI flows.
   - Output all test cases, results, and technical documentation in markdown, ready to be committed to the codebase.

**Deliverable:**
- All code, logic, and documentation needed for Supervisor, Producer, and Consumer Agents, agent-to-agent communication, and basic UI/UX for AgriConnect Phase 2, ready for use by subsequent Bolt.new agent development prompts. 

---

**Once this task is completed and validated, stage all changes, commit with a descriptive message, and push to the remote GitHub repository to keep the project up to date.** 