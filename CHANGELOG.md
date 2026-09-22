# Changelog
All notable changes to the MTJ Complaint Management System (CMS) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.0] - 2026-09-13
### Added
- **Unified Permissions Engine (`src/utils/permissions.ts`)**:
  - Implemented centralized `can(user, permission, complaint?)` permission evaluation.
  - Intersects user role, organizational scope (`GLOBAL`, `ENTITY`, `REGION`, `LOCATION`, `ASSIGNED_ONLY`, `CASE_ACL`), and track clearance (`SERVICE`, `CONFIDENTIAL`, `SAFEGUARDING`).
  - Added `evaluatePermission()` diagnostic helper that outputs human-readable rationales for why any given permission was granted or denied.
- **Dedicated Per-Persona Interfaces**:
  - **Handler Workspace (`/workspace`)**: Single-column personal case queue, urgent countdown badges, full-screen case detail view, activity feed, and modal for submitting resolution notes (min 30 characters) with mandatory root-cause categorization.
  - **Team Lead Console (`/console`)**: Three-tab operational console (*Triage*, *Active Cases*, *Awaiting Approval*). Live handler workload indicators (e.g. `Hamza Tariq · 3 open`), bulk reassignment, and closure approval review.
  - **Executive View (`/executive`)**: Read-only strategic intelligence board featuring 12-week weekly trend line charts by track, location hotspots with chronic repeat flags, systemic issue alerts (>30% MoM increase), and team lead accountability tables.
  - **Safeguarding Console (`/safeguarding`)**: High-security console for Child Protection Officer and CEO. Automatic conflict-of-interest exclusion banners and a tamper-evident access log listing every user who viewed the record with timestamps.
  - **Users & Access Admin (`/admin` tab)**: Enterprise directory of ~20 staff members with confidential clearance toggles, safeguarding ACL flags, an *Effective Permissions* modal, and an interactive *Permissions Sandbox* testing engine.
- **Enhanced Status Lifecycle**:
  - Inserted intermediate state `PENDING_CLOSURE` between `IN_PROGRESS` and `CLOSED` to enforce mandatory Separation of Duties.
  - Handlers can only progress cases to `PENDING_CLOSURE`; only Team Leads or above can approve transition to `CLOSED`.
  - Added `REOPENED` transition from `CLOSED` with mandatory justification notes and SLA reset.
- **Project Documentation & Architecture Specs**:
  - In-app technical documentation browser (`/docs`) with responsive markdown rendering.
  - Created root `README.md`, `.env.example`, and `server/.env.example`.
  - Created technical guides: `docs/PERMISSIONS.md`, `docs/DATA-MODEL.md`, `docs/API-CONTRACT.md`, and `docs/HANDOVER.md`.

### Changed
- Refactored mock datasets with ~20 Pakistani staff accounts across Handlers, Team Leads, Top Management, CPO, Super Admin, and Auditors.
- Updated mock complaints to populate the `PENDING_CLOSURE` queue with sample root causes and resolution notes.
- Updated top navigation header to include a live active user/persona selector that seamlessly shifts between the distinct persona workspaces and public citizen intake.

---

## [2.0.0] - 2026-09-12
### Added
- Bilingual intake flow in Noto Nastaliq Urdu (RTL) and English (LTR).
- 60-second voice note recording and audio playback.
- Photo attachment previews.
- Public ticket tracking vertical timeline.
- Dynamic QR code generation for 22 physical facilities.
- Multi-tier SLA escalation policies.

---

## [1.0.0] - 2026-09-10
### Added
- Initial prototype schema and mock data for AAS Lab, MTJ Foundation, Alhasanain Schools, and Alhasanain College.
