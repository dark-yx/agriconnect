# Bolt.new Agent Prompt: Phase 1 – Planning and Initial Setup

## Prompt

You are an expert AI architect and requirements engineer working in Bolt.new. Your task is to generate all foundational code, logic, and documentation for Phase 1 of the AgriConnect platform, a multi-agent, AI-powered agricultural marketplace. This phase establishes the technical and functional groundwork for the entire system.

**Instructions:**

1. **Requirements and User Stories Module**
   - For each agent/persona (Producer, Exporter, Consumer, Supervisor, Market Analyst, Logistics, Quality Assurance), generate:
     - Persona description (role, goals, pain points, expected platform interactions)
     - Functional requirements (features, actions, data handled)
     - Non-functional requirements (performance, security, usability, scalability, etc.)
   - For each requirement, write user stories in the format:
     - `As a [persona], I want to [action], so that [goal].`
     - Include acceptance criteria for each user story.
   - Organize requirements and user stories by agent and by feature/module (e.g., product listing, search, transaction, reputation, analytics, logistics, quality assurance, etc.).
   - Ensure traceability: each user story should reference the requirement(s) it fulfills.
   - Output all requirements and user stories as markdown files, ready to be committed to the codebase under a `/requirements/` directory.
   - Include a summary table mapping requirements to user stories and agents.

2. **Initial Database Schema and Models**
   - Design a normalized relational schema for the core entities: users (with roles), products, transactions, and any other foundational data needed for the MVP.
   - Specify all fields, types, relationships, and constraints.
   - Output the schema as SQL (Postgres dialect) and as ORM models (JavaScript/TypeScript, suitable for use in Bolt.new backend agents).
   - Include comments and documentation for each table/model.

3. **Authentication and Role Logic**
   - Implement authentication logic for email/password and Google OAuth.
   - Assign user roles (producer, exporter, consumer, admin, etc.) at registration and login.
   - Expose secure endpoints for registration, login, and role-based access control.
   - Use best practices for security and error handling.
   - Output the backend code for authentication and role management, ready to be integrated with the rest of the platform.

4. **Foundational API Endpoints**
   - Implement RESTful API endpoints for CRUD operations on users, products, and transactions.
   - Ensure endpoints are secure and respect role-based permissions.
   - Include example requests and responses for each endpoint.

5. **Documentation**
   - Output all requirements, user stories, schema, and API documentation in markdown, ready to be committed to the codebase.
   - Include a README for the `/requirements/` and `/api/` directories, describing their structure and usage.

**Deliverable:**
- All code, logic, and documentation needed for requirements, user stories, initial database schema, authentication, and foundational API endpoints for AgriConnect Phase 1, ready for use by subsequent Bolt.new agent development prompts. 

---

**Once this task is completed and validated, stage all changes, commit with a descriptive message, and push to the remote GitHub repository to keep the project up to date.** 