# Frontend Rules

## Stack
Frontend uses:
- React
- Vite
- TypeScript
- Tailwind CSS

Do not introduce Next.js-specific APIs such as:
- next/image
- next/link
- "use client"
- Next.js routing conventions

## UI Design Direction

Design style:
- Linear
- Vercel
- Notion
- GitHub Projects

Avoid generic AI-generated SaaS interfaces.

Avoid:
- excessive rounded cards
- purple/blue gradients everywhere
- glassmorphism everywhere
- excessive shadows
- huge headings
- excessive whitespace
- unnecessary badges
- unnecessary icons
- wrapping every section in a Card

Prefer:
- clean professional layouts
- strong typography hierarchy
- subtle 1px borders
- neutral backgrounds
- restrained border radius
- compact information density
- clear hover/focus/active states

## Components

Prefer reusing existing project components.

Allowed references/libraries:
- shadcn/ui
- Radix UI
- Lucide React
- Motion
- Motion Primitives
- React Bits
- 21st.dev

Do not install or replace UI libraries unless necessary.

## Existing Code

Do not rewrite working components unnecessarily.

When implementing a feature:
1. Inspect existing components first.
2. Reuse existing patterns.
3. Change only files related to the requested feature.
4. Do not redesign unrelated screens.
5. Preserve existing API contracts and application behavior.
