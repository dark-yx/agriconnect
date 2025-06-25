# AgriConnect

**Developer:** Jonnathan Peña

---

## Overview

AgriConnect is an AI-powered, multi-agent marketplace platform designed to revolutionize the global agricultural sector. Built for the "World's Largest Hackathon presented by Bolt," AgriConnect directly connects producers, exporters, and consumers, solving critical inefficiencies in the supply chain, reducing waste, stabilizing prices, and building trust through transparency and advanced technology.

---

## Vision & Value Proposition
- **Unified Digital Ecosystem:** Seamlessly connects all agricultural stakeholders.
- **Multi-Agent Intelligence:** Specialized agents (Producer, Exporter, Consumer, Supervisor, Market Analyst, Logistics, Quality Assurance) automate, optimize, and personalize every interaction.
- **Transparency & Trust:** Blockchain-based traceability, robust reputation systems, and real-time data validation.
- **AI-Driven Efficiency:** Dynamic pricing, demand forecasting, personalized recommendations, and automated negotiation.
- **Inclusive & Scalable:** Designed for smallholder farmers and global markets alike, with intuitive, chat-based interfaces and cloud-native scalability.

---

## Technical Architecture
- **Core:** Multi-agent system orchestrated by LangGraph, with dynamic LLM model switching for cost and performance optimization.
- **LLM Model Flexibility:** AgriConnect supports dynamic selection and switching of LLM providers, including OpenAI (GPT-4/3.5), Gemini, Anthropic (Claude), and others. The application can be configured to use any supported model at runtime, and agents can select the most appropriate LLM for each task. This ensures maximum flexibility, cost optimization, and future-proofing.
- **Frontend:** Responsive, conversational UI built in Bolt.new, supporting all user personas.
- **Backend:** Node.js (Bolt.new WebContainers), with modular agent logic and RESTful APIs.
- **Database:** Supabase (Postgres) for relational data, authentication, and real-time features.
- **Blockchain:** Algorand for smart contracts, transaction traceability, and product origin.
- **Payments:** Stripe integration for secure, automated transactions.
- **Observability:** LangSmith for workflow tracing, performance monitoring, and prompt evaluation.
- **CI/CD & Hosting:** GitHub for version control, Netlify for automated deployment and hosting.
- **Voice AI Integration:** ElevenLabs Voice AI is integrated to provide text-to-speech and voice notifications. This enhances accessibility, allows users (especially those in rural or low-literacy contexts) to receive information and alerts via natural-sounding voice, and supports voice-driven user experiences. ElevenLabs can be enabled/disabled or configured per user or agent as needed.

---

## Project Structure
```
/ai_docs/           # Documentation, technical proposal, thesis, master plan, task prompts
  master_plan.md    # High-level roadmap and phases
  task/             # One prompt per development phase (task_01.md ... task_08.md)
/src/               # Main source code (frontend, backend, agents, contracts, utils, tests)
  frontend/         # UI components and pages
  backend/          # Node.js server, API routes, services
  agents/           # Agent logic (LangGraph nodes, tools, LLM switching)
  contracts/        # Algorand smart contracts
  utils/            # Shared utilities and constants
  tests/            # Unit and integration tests
/public/            # Static frontend assets
.github/            # CI/CD workflows
.env.example        # Environment variable template
package.json        # Project dependencies
README.md           # This file
```

---

## Main Technologies
- **Bolt.new:** Full-stack, in-browser AI development and deployment
- **LangGraph:** Multi-agent orchestration and workflow engine
- **Supabase:** Managed Postgres, authentication, real-time
- **Algorand:** Blockchain for smart contracts and traceability
- **Stripe:** Payment gateway
- **Netlify:** CI/CD and hosting
- **LangSmith:** Observability and prompt evaluation
- **Node.js, JavaScript/TypeScript:** Core backend and agent logic
- **OpenAI, Gemini, Anthropic:** Interchangeable LLM providers for all agent reasoning and workflows
- **ElevenLabs:** Voice AI for text-to-speech and voice notifications

---

## Development & Deployment Guide
1. **Follow the Master Plan:**
   - See `ai_docs/master_plan.md` for the full roadmap.
   - Each phase is detailed in `ai_docs/task/task_0X.md` prompts—use these as direct instructions for Bolt.new agent development.
2. **Code Generation:**
   - Use each `task_0X.md` as a Bolt.new prompt to generate the required code, logic, and documentation for that phase.
   - Commit all outputs to the repository, following the project structure.
3. **Testing:**
   - Run all unit, integration, and end-to-end tests as specified in the prompts.
   - Use LangSmith for workflow tracing and prompt evaluation.
4. **Deployment:**
   - Deploy the frontend/backend via Netlify (see deployment scripts/configuration).
   - Ensure the "Built with Bolt.new" badge is visible in the public app.
   - Use GitHub for version control and CI/CD.
5. **Final Audit & Push:**
   - After completing all phases, use `task_08.md` to audit the codebase and push the final state to GitHub.

---

## Why AgriConnect is a Winning Hackathon Entry
- **Ambitious Scope:** Tackles real, global problems in agriculture with a holistic, multi-agent approach.
- **Technical Excellence:** Leverages the full power of Bolt.new, LangGraph, Supabase, Algorand, and modern AI/ML.
- **LLM Flexibility:** Supports OpenAI, Gemini, Anthropic, and future models, with dynamic switching for cost and performance.
- **Voice AI Innovation:** ElevenLabs integration for accessibility and next-gen user experience.
- **Scalability & Sustainability:** Cloud-native, modular, and ready for global expansion.
- **User-Centric:** Intuitive, chat-based UI and personalized tools for every user type.
- **Trust & Transparency:** Blockchain traceability, reputation systems, and real-time data validation.
- **Comprehensive Documentation:** Every phase, feature, and agent is fully documented and reproducible.

---

## References & Further Reading
- `ai_docs/AgriConnect-Technical_Proposal.md` – Full technical proposal
- `ai_docs/Tesis_ AgriConnect - A Multi-Agent AI Marketplace for Agricultural Transformation.md` – In-depth thesis
- `ai_docs/master_plan.md` – Master plan and roadmap
- `ai_docs/task/` – Step-by-step Bolt.new prompts for every phase

---

## Credits
- **Lead Developer:** Jonnathan Peña
- **Built for:** World's Largest Hackathon presented by Bolt

---

## Contact
For questions, contributions, or feedback, please contact Jonnathan Peña or open an issue in the GitHub repository. 