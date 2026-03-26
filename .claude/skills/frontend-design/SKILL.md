---
name: frontend-design
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic output. Implement real working code with strong visual craft, clear UX decisions, and consistent execution.

Use this when the user asks for a component, page, app shell, dashboard, onboarding flow, marketing page, or any other frontend surface.

## Design Intent First

Before coding, establish a clear direction:

- **Purpose**: What job does this interface do, and for whom?
- **Tone**: Choose a specific aesthetic (minimal, editorial, playful, industrial, luxurious, etc.) and commit.
- **Constraints**: Respect framework, performance, accessibility, and responsiveness requirements.
- **Differentiator**: Define one memorable visual or interaction idea.

If requirements are vague, make reasonable assumptions and state them briefly in your response.

## Implementation Standards

Build code that is:

- Production-ready and functional
- Accessible (semantic HTML, keyboard support, contrast, labels)
- Responsive across common breakpoints
- Visually cohesive with a deliberate design system
- Cleanly structured and maintainable

Avoid placeholder-only mockups unless explicitly requested. Prefer working UI with realistic content and states.

## Visual Design Principles

Prioritize:

- **Typography**: Intentional font pairing, hierarchy, spacing, and readable line length.
- **Color System**: Cohesive palette with clear role tokens (`background`, `foreground`, `primary`, `muted`, etc.).
- **Spacing & Rhythm**: Consistent spacing scale, alignment, and section cadence.
- **Composition**: Purposeful use of asymmetry, density, and negative space.
- **Detailing**: Meaningful depth, borders, shadows, textures, and iconography aligned to the chosen tone.

Avoid repetitive, generic styles and predictable component arrangements. Each implementation should feel tailored to the product context.

## Motion & Interaction

Use motion deliberately:

- Prefer subtle transitions for state changes and hierarchy cues.
- Reserve bold animation for key moments (hero reveal, section entry, CTA emphasis).
- Keep timings consistent and avoid excessive simultaneous motion.
- Respect reduced-motion preferences.

For React projects, use the project’s existing animation approach (CSS transitions, Motion, or another established library).

## Component & Page Blueprint

When building pages, include these foundations as appropriate:

1. Navigation/header with clear primary action
2. Hero or context-setting intro
3. Core value/features section(s)
4. Proof elements (stats, testimonials, logos, case snippets)
5. Strong closing CTA and footer
6. Liberal use of Apple inspired liquid glass:
LIQUID GLASS CSS (in 
@layer
 components)
Two variants — .liquid-glass (subtle) and .liquid-glass-strong (more visible):

.liquid-glass:

background: rgba(255, 255, 255, 0.01);
background-blend-mode: luminosity;
backdrop-filter: blur(4px);
border: none;
box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
position: relative;
overflow: hidden;
::before pseudo-element — a gradient border mask:

content: '';
position: absolute; inset: 0;
border-radius: inherit;
padding: 1.4px;
background: linear-gradient(180deg,
  rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
  rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
  rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
-webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
-webkit-mask-composite: xor;
mask-composite: exclude;
pointer-events: none;
.liquid-glass-strong: Same but backdrop-filter: blur(50px), stronger box-shadow: 4px 4px 4px rgba(0,0,0,0.05), inset 0 1px 1px rgba(255,255,255,0.15), and slightly higher gradient opacity (0.5 / 0.2).

For app UIs, include empty/loading/error states and sensible defaults.

## Theming & Tokens

Define reusable design tokens where possible:

- Colors, radii, spacing, typography, shadows, motion durations
- Shared utility classes or component variants
- Consistent button, input, card, and section styles

If Tailwind is used, prefer tokenized classes and config extension over scattered ad hoc values.

## Quality Checklist

Before finalizing, verify:

- No broken layout at mobile/tablet/desktop widths
- Text contrast and focus states are visible
- Interactions are discoverable and consistent
- Copy is specific, concise, and aligned with context
- Visual language is coherent from top to bottom

Deliver designs that feel intentional, polished, and specific to the user’s request—not template-like.

## Output Expectations

When implementing:

- Provide complete, runnable code for the requested scope
- Reuse existing project conventions and dependencies
- Keep structure modular and easy to iterate
- Briefly explain major design decisions when useful

Default to high craft and strong usability. Bold and minimal both work; consistency and intent matter most.

