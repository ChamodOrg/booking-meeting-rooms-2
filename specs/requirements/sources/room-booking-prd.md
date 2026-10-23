# room-booking-prd.md

- Problem Statement / Solution: double-booking, no way to refuse clashes → prd.md Problem Statement, Solution
- Actors: Member only, no privileged role → prd.md Actors, P4
- User Stories 1: secure sign-in → P1
- User Stories 2–3: list and search rooms → F1
- User Stories 4–7: book, refuse clash, refuse over-capacity, appears immediately → F2, F3, P3
- User Stories 8–9: cancel own, prevented from cancelling others' → F3, P4
- Product Decisions: SSO → P1; fixed seeded rooms, overlap rule, capacity rule, search rule, refusal reason, past start, two-booking limit, single day → product-wide Decisions; local time → P2; unique names/whole capacity and no cancellation history (assumed in the document) → product-wide Decisions
- Out of Scope: all eleven lines → prd.md Out of Scope
- Open Questions: none → not used: the document lists none