# Bolt.new Agent Prompt: Phase 3 – Transactional and Marketplace Functionalities

## Prompt

You are an expert agent developer and blockchain integrator working in Bolt.new. Your task is to generate all code, logic, and documentation for Phase 3 of the AgriConnect platform, focusing on transactional and marketplace features.

**Instructions:**

1. **Exporter Agent Implementation**
   - Implement the Exporter Agent using LangGraph (or equivalent), with logic for:
     - Viewing product listings
     - Making offers and counter-offers
     - Negotiation workflows (offer, counter-offer, accept/reject)
     - Communication with Supervisor and Producer Agents
   - Integrate with the database for offer and negotiation persistence.
   - Output the full source code and documentation for the Exporter Agent.

2. **Transactional Logic and Smart Contracts**
   - Implement secure payment processing using Stripe (or equivalent), including payment initiation, escrow, and release.
   - Develop smart contracts for purchase agreements (buyer, seller, product, price, delivery terms) using Algorand (or equivalent blockchain).
   - Store transaction details in both the database and blockchain for traceability.
   - Output all backend code, smart contract code, and documentation.

3. **Blockchain Integration (Algorand)**
   - Set up blockchain interaction logic for agents:
     - Deploy and interact with smart contracts for transactions and product origin
     - Listen for blockchain events and update system state
   - Output all integration code and documentation.

4. **Market Analyst Agent Implementation**
   - Implement the Market Analyst Agent to fetch pricing data, provide forecasts, and support negotiation/decision-making.
   - Integrate with other agents and workflows.
   - Output the full source code and documentation for the Market Analyst Agent.

5. **Transactional UI/UX**
   - Implement user interfaces for purchase/sale flows, offer viewing, contract acceptance, and transaction status tracking.
   - Ensure real-time updates and clear feedback for users.
   - Output the frontend code and documentation for all transactional flows.

6. **Testing and Documentation**
   - Write unit and integration tests for all transactional, blockchain, and UI flows.
   - Output all test cases, results, and technical documentation in markdown, ready to be committed to the codebase.

**Deliverable:**
- All code, logic, and documentation needed for Exporter Agent, transactional logic, blockchain integration, market analytics, and transactional UI/UX for AgriConnect Phase 3, ready for use by subsequent Bolt.new agent development prompts. 

---

**Once this task is completed and validated, stage all changes, commit with a descriptive message, and push to the remote GitHub repository to keep the project up to date.**

**Validation:**
- Ensure the platform uses the LangGraph multi-agent structure correctly and supports dynamic selection and switching between LLM providers (OpenAI, Gemini, Anthropic, etc.) at runtime, with no changes required to application logic. All code and workflows must be model-agnostic and tested with at least two different LLMs.

--- 