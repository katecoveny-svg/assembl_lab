// Records from assembl's architecture studio (assembl-hanga, architecture-studio/specialists.json and rules.json, snapshot of
// 17 Nov 2026), copied unchanged apart from trimming each purpose to its first sentence and each specialist to one limit.
export const STUDIO_TOTAL = 33;
export const ROSTER = [
 {
  "id": "architecture",
  "name": "Architecture and plan coordination",
  "does": "Act as the architectural design coordinator for spatial intent, plan-to-model fidelity and revision decisions.",
  "reviewer": "Project architect or responsible architectural designer",
  "limit": "The supported rectangular shell is not a complete architectural design."
 },
 {
  "id": "nz_code",
  "name": "NZ building-code review preparation",
  "does": "Act as a New Zealand building-code evidence coordinator, preparing a qualified reviewer rather than determining compliance.",
  "reviewer": "Qualified NZ building professional and relevant specialist engineers",
  "limit": "Current geometry checks do not assess all NZ Building Code, planning or consent requirements; current official sources must be verified."
 },
 {
  "id": "site_environment",
  "name": "Site placement, sun and wind evidence",
  "does": "Act as the site-orientation and environmental evidence analyst.",
  "reviewer": "Architect, surveyor, building physicist and wind/structural engineer",
  "limit": "Deterministic adapter is implemented; registry listing does not automatically connect it to a paid-agent tool dispatch."
 },
 {
  "id": "material_lookdev",
  "name": "Architectural surfaces and material response",
  "does": "Act as the physically based material look-development specialist for timber, stone, metal, glass, paint and textiles.",
  "reviewer": "Material artist, architectural designer and specification reviewer",
  "limit": "Live reviews may use only the host-provided read-only evidence tool within the approved quote. Model output cannot initiate further spending, external communications, publication, CAD changes or autonomous approval."
 },
 {
  "id": "render_art_director",
  "name": "Architectural render art director",
  "does": "Direct architectural images as a senior architectural photographer, material/look-development director and spatial design reviewer.",
  "reviewer": "Project architect and rendering art director",
  "limit": "Execution is through the dedicated bounded render-director host, not arbitrary generated code."
 },
 {
  "id": "design_communications",
  "name": "Design storytelling and practice communications",
  "does": "Act as the architecture practice editorial and project-story specialist.",
  "reviewer": "Practice communications lead, architect, client and image rights holders",
  "limit": "No email, invitations, award submissions, contact harvesting or external scheduling. No partner relationship, discount, award or client approval may be invented."
 },
 {
  "id": "client_relations",
  "name": "Client relationships and opportunity review",
  "does": "Act as the architecture practice relationship and opportunity qualification analyst.",
  "reviewer": "Practice owner and privacy/communications reviewer",
  "limit": "No email, invitations, award submissions, contact harvesting or external scheduling. No partner relationship, discount, award or client approval may be invented."
 },
 {
  "id": "plans_examiner",
  "name": "Independent NZ plans examiner",
  "does": "Independently examine the selected multidisciplinary package and correction round.",
  "reviewer": "Independent qualified reviewer for the relevant disciplines and responsible lead professional; consent authority retains its statutory role",
  "limit": "Do not act as the designer and independent closer of the same correction. A designer declaration, model verdict, empty issue list or successful local check is not professional approval, consent or permission to build."
 }
];
export const RULES_NOTE = "Metadata-only research registry; not a compliance engine or complete regulatory catalogue";
export const RULES = [
 {
  "id": "nz.consent",
  "title": "Consent and project scope",
  "authority": "Building Act / MBIE",
  "reviewer": "designer / BCA",
  "url": "https://www.building.govt.nz/projects-and-consents/apply-for-building-consent",
  "checked": "2026-11-16",
  "status": "unassessed"
 },
 {
  "id": "nz.restricted_design",
  "title": "Restricted design work",
  "authority": "MBIE",
  "reviewer": "appropriately licensed designer",
  "url": "https://www.building.govt.nz/projects-and-consents/planning-a-successful-build/scope-and-design/choosing-the-right-people-for-your-type-of-building-work/use-licensed-professionals-for-restricted-building-work/restricted-building-work/carrying-out-restricted-building-work",
  "checked": "2026-11-16",
  "status": "unassessed"
 },
 {
  "id": "nz.standards_licensing",
  "title": "Standards digital-use licence",
  "authority": "Standards New Zealand",
  "reviewer": "licensing owner",
  "url": "https://www.standards.govt.nz/news-and-updates/using-standards-content-in-digital-and-ai-tools-what-you-need-to-know",
  "checked": "2026-11-16",
  "status": "unassessed"
 },
 {
  "id": "nz.h1",
  "title": "Energy-efficiency pathway",
  "authority": "MBIE",
  "reviewer": "energy-efficiency designer",
  "url": "https://www.building.govt.nz/building-code-compliance/h-energy-efficiency/h1-energy-efficiency/acceptable-solutions-and-verification-methods",
  "checked": "2026-11-16",
  "status": "unassessed"
 },
 {
  "id": "nz.fire",
  "title": "Fire pathway and scope",
  "authority": "MBIE",
  "reviewer": "fire designer / engineer",
  "url": "https://www.building.govt.nz/building-code-compliance/c-protection-from-fire/c-clauses-c1-c6/acceptable-solutions-and-verification-methods",
  "checked": "2026-11-16",
  "status": "unassessed"
 },
 {
  "id": "nz.accessibility",
  "title": "Access and facilities",
  "authority": "Building Act",
  "reviewer": "accessibility designer",
  "url": "https://www.legislation.govt.nz/act/public/2004/72/en/latest/",
  "checked": "2026-11-16",
  "status": "unassessed"
 },
 {
  "id": "nz.change_of_use",
  "title": "Alterations and change of use",
  "authority": "MBIE",
  "reviewer": "designer / territorial authority",
  "url": "https://www.building.govt.nz/managing-buildings/change-of-use-and-alterations",
  "checked": "2026-11-16",
  "status": "unassessed"
 },
 {
  "id": "nz.specified_systems",
  "title": "Specified systems and compliance schedule",
  "authority": "MBIE",
  "reviewer": "systems specialists / council",
  "url": "https://www.building.govt.nz/managing-buildings/managing-your-bwof/specified-systems-and-compliance-schedules",
  "checked": "2026-11-16",
  "status": "unassessed"
 },
 {
  "id": "nz.bwof",
  "title": "BWoF lifecycle evidence",
  "authority": "MBIE",
  "reviewer": "owner / IQP",
  "url": "https://www.building.govt.nz/managing-buildings/managing-your-bwof",
  "checked": "2026-11-16",
  "status": "unassessed"
 },
 {
  "id": "nz.evacuation",
  "title": "Evacuation scheme or procedure",
  "authority": "FENZ",
  "reviewer": "owner / fire specialist / FENZ",
  "url": "https://www.fireandemergency.nz/building-fire-safety/evacuation-schemes/",
  "checked": "2026-11-16",
  "status": "unassessed"
 },
 {
  "id": "nz.planning",
  "title": "Site and planning requirements",
  "authority": "MBIE / relevant territorial authority",
  "reviewer": "planner / designer / territorial authority",
  "url": "https://www.building.govt.nz/projects-and-consents/planning-a-successful-build/scope-and-design/choosing-the-right-people-for-your-type-of-building-work/choosing-a-designer-or-architect-for-your-building-project",
  "checked": "2026-11-16",
  "status": "unassessed"
 }
];
