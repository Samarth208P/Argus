# Dovetail — Style Reference
> Blueprint grid under a black moon — faint graph lines, white type, one violet spark.

**Theme:** dark

Dovetail operates in a midnight command-center language: a near-black canvas structured by a faint blueprint grid, with white type and a single soft indigo accent. Surfaces stack from pure black to charcoal, each step subtle enough to feel like elevation through luminance rather than shadow. The system is compact and data-dense — Inter carries every reading load, JetBrains Mono stamps categorical labels, and 8px radii keep containers crisp rather than soft. Color is rationed: most of the interface stays achromatic, with #6798ff appearing only as functional punctuation on icons, stat markers, and chart elements.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Soft Indigo | `#6798ff` | `--color-soft-indigo` | Brand accent — iconography, stat markers, chart series, link states; the single chromatic note in an otherwise achromatic system |
| Pure Black | `#000000` | `--color-pure-black` | Deepest surface — modal backdrops, full-bleed image fills, inline SVG fills |
| Carbon | `#0a0a0a` | `--color-carbon` | Page canvas — the primary background; near-black with no warmth |
| Graphite | `#141414` | `--color-graphite` | Card surface — one step above the canvas to delineate content blocks |
| Iron | `#1e1e1e` | `--color-iron` | Elevated surface and border — secondary cards, table rows, subtle dividers |
| Slate Edge | `#313131` | `--color-slate-edge` | Hairline borders on imagery and nested elements — visible but recessive |
| Smoke | `#454545` | `--color-smoke` | Dark borders and separators for elevated surfaces and inverted UI. Do not promote it to the primary CTA color |
| Mist | `#7c7c7c` | `--color-mist` | Disabled or low-emphasis button text |
| Ash | `#a7a7a7` | `--color-ash` | Secondary text — captions, metadata, helper text, muted labels |
| Bone | `#ffffff` | `--color-bone` | Primary text, icons, filled CTA background, card surface inverts; the dominant light element in the dark system |

## Tokens — Typography

### Inter — Primary typeface for headings, body, navigation, and buttons. Used at 64px/56px for display headlines with tight tracking, 40px for section headings, 24px/20px for subheadings, 16px for body and nav, 14px for captions. Weight 400 is the reading default; 500–600 for labels and emphasis. Negative letter-spacing tightens at scale (–0.036em at 64px tapering to –0.012em at 20px) — the optical correction keeps large display type from feeling airy. · `--font-inter`
- **Substitute:** Inter or any neo-grotesque sans (Söhne, GT America)
- **Weights:** 400, 500, 600
- **Sizes:** 14, 16, 20, 24, 40, 56, 64
- **Line height:** 1.13–1.57
- **Letter spacing:** -2.3px at 64px, -2.0px at 56px, -0.84px at 40px, -0.6px at 24px, -0.5px at 20px, -0.25px at 16px
- **OpenType features:** `"liga"`
- **Role:** Primary typeface for headings, body, navigation, and buttons. Used at 64px/56px for display headlines with tight tracking, 40px for section headings, 24px/20px for subheadings, 16px for body and nav, 14px for captions. Weight 400 is the reading default; 500–600 for labels and emphasis. Negative letter-spacing tightens at scale (–0.036em at 64px tapering to –0.012em at 20px) — the optical correction keeps large display type from feeling airy.

### JetBrains Mono — All-caps category labels, section eyebrows (e.g. "HOW IT WORKS"), beta tags, and micro-text. Wide tracking (+0.071em to +0.083em) gives the type a stamped, technical feel — it reads as metadata, not copy. The system is compact and data-dense — Inter carries every reading load, JetBrains Mono stamps categorical labels, and 8px radii keep containers crisp rather than soft. · `--font-jetbrains-mono`
- **Substitute:** JetBrains Mono or IBM Plex Mono
- **Weights:** 400
- **Sizes:** 12, 14
- **Line height:** 1.00, 1.40
- **Letter spacing:** +0.85px at 12px, +1.16px at 14px
- **OpenType features:** `"liga"`
- **Role:** All-caps category labels, section eyebrows (e.g. "HOW IT WORKS"), beta tags, and micro-text. Wide tracking (+0.071em to +0.083em) gives the type a stamped, technical feel — it reads as metadata, not copy. Sets it apart from Inter's proportional rhythm and signals the product's data/analytics domain.

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|------|------|-------------|----------------|-------|
| caption | 12px | 1.4 | 0.85px | `--text-caption` |
| body-sm | 14px | 1.57 | -0.25px | `--text-body-sm` |
| body | 16px | 1.5 | -0.25px | `--text-body` |
| heading-sm | 20px | 1.33 | -0.42px | `--text-heading-sm` |
| heading | 24px | 1.29 | -0.6px | `--text-heading` |
| heading-lg | 40px | 1.2 | -0.84px | `--text-heading-lg` |
| display-sm | 56px | 1.14 | -1.74px | `--text-display-sm` |
| display | 64px | 1.13 | -2.3px | `--text-display` |

## Tokens — Spacing & Shapes

**Base unit:** 8px

**Density:** compact

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 8 | 8px | `--spacing-8` |
| 16 | 16px | `--spacing-16` |
| 24 | 24px | `--spacing-24` |
| 32 | 32px | `--spacing-32` |
| 40 | 40px | `--spacing-40` |
| 64 | 64px | `--spacing-64` |
| 96 | 96px | `--spacing-96` |
| 200 | 200px | `--spacing-200` |

### Border Radius

| Element | Value |
|---------|-------|
| tags | 4px |
| cards | 8px |
| inputs | 8px |
| buttons | 8px |
| navPills | 9999px |

### Layout

- **Page max-width:** 1200px
- **Section gap:** 80px
- **Card padding:** 24px
- **Element gap:** 8px

## Components

### Primary Button (Filled)
**Role:** High-emphasis call to action

White background (#ffffff), black text (#0a0a0a), 8px radius, 8px 16px padding, Inter 14px/500. Used for "Contact sales" and "Request a demo". The inverted treatment against the dark canvas creates maximum contrast — it is the only high-luminance element on most pages.

### Secondary Button (Ghost)
**Role:** Medium-emphasis action

Transparent background, 1px #454545 border, white text, 8px radius, 8px 16px padding, Inter 14px/500. Used for "Try Dovetail free". Reads as the same action class as the primary but defers visual weight.

### Navigation Pill
**Role:** Top-nav link container

Rounded pill shape (9999px radius), transparent background, white text, 8px 14px padding, Inter 14px/500. Product, Use cases, Resources, Enterprise, Customers, Pricing all use this shape. Sits flush on the dark canvas without a border.

### Nav CTA Group
**Role:** Right-aligned action pair in header

"Log in" as plain text link beside a filled white "Contact sales" button. The pair establishes a clear hierarchy: passive text for existing users, high-contrast action for new ones.

### Dashboard Preview Card
**Role:** Product hero visual — a live-looking data UI

Charcoal surface (#141414) with #1e1e1 borders, 8px radius, 24px padding. Contains a header bar (icon + title + tab toggle), a date-range selector, a bar chart with multi-color series, and a sortable data table below. The card demonstrates the product's actual interface — it is rendered, not illustrated.

### Stat Block
**Role:** Three-column KPI presentation

Large numeric value in Inter 40px/500 white, preceded by a small #6798ff icon (up-arrow, clock, speedometer), followed by a bold white label (16px/500) and a descriptive caption in #a7a7a7 (14px/400). Three blocks sit in a row with even spacing, centered within the content width.

### Section Eyebrow Label
**Role:** Categorical heading stamp above section titles

JetBrains Mono 12px uppercase #a7a7a7 eyebrow with +0.85px tracking, 32px gap, then 40px Inter weight 500 #ffffff heading, then optional 16px Inter weight 400 #a7a7a7 body below at max-width 640px.

### Trust Logo Strip
**Role:** Social-proof band

Horizontal row of 6 monochrome customer logos in #a7a7a7, set at small scale (24–32px height) with even spacing. A short white label sits above: "Connecting the world's leading companies to their customers:". Flanked by star-rating summaries on the right.

### Footer Link Column
**Role:** Site-map navigation group

Each column starts with a JetBrains Mono 12px uppercase label in white, followed by 6–8 Inter 14px/400 links in #ffffff stacked with 12px row gap. Five columns total: Platform, Use Cases, Resources, Contact, Explore Outlier. The "Explore Outlier" column includes a long-form link block and a CTA arrow.

### BETA Tag
**Role:** Feature status indicator

Small inline label next to feature names (e.g. "AI Dashboards BETA"). Likely JetBrains Mono 12px in #a7a7a7 or a subtle bordered pill. Signals provisional status without alarming the reader.

### Promo Banner
**Role:** Top-of-page announcement strip

Full-width bar above the nav with a #6798ff or similar accent fill, white text, centered content. Contains a visual badge, short promotional copy, and a CTA. Sits above the main nav and establishes a secondary action channel.

### Chart Bar (Data Series)
**Role:** In-product visualization element

Vertical bars at varied heights with rounded tops, rendered in multiple accent hues (indigo, magenta, orange, green) against the charcoal card surface. Bars are ~6–8px wide with 2–4px gaps. The multi-color treatment is unique to data viz — the rest of the site stays monochromatic.

### Brand Logo (Argus Logo)
**Role:** Brand identity icon in header and footer

Outline-style custom geometric icon representing an abstract eye/shield, rendered in soft indigo `#6798ff` as per the system's single accent rule. Sits at the left of the navigation bar at a fixed height of 24px, accompanied by the brand name "ARGUS" in Inter bold 16px. Defined by the SVG asset at `argus.svg`.

## Do's and Don'ts

### Do
- Use #0a0a0a as the universal page background — never pure white or lighter charcoal for the main canvas.
- Stack surfaces at #000000 → #0a0a0a → #141414 → #1e1e1 → #313131 to communicate elevation through luminance, not shadow.
- Apply #6798ff only to functional accents (stat icons, chart series, link hovers) — never as a large fill or background wash.
- Set headings in Inter 400–500 with negative letter-spacing scaling from –0.036em at 64px to –0.012em at 20px.
- Stamp section eyebrows in JetBrains Mono 12px, uppercase, with +0.071em tracking and #a7a7a7 color.
- Use 8px as the default radius for buttons, cards, and inputs; reserve 4px for inline tags and micro-elements.
- Pair every primary CTA (white fill) with a ghost secondary (transparent + #454545 border) in the same action group.

### Don't
- Do not introduce a second chromatic accent — the system runs on one indigo; adding green, red, or warm tones dilutes the signal.
- Do not use drop shadows for elevation; depth comes from surface stepping, not box-shadow.
- Do not center-align body copy — left-align paragraphs and descriptions; reserve center-align for headlines and stat blocks.
- Do not use display sizes below 40px in Inter; if something needs to be smaller than body, switch to JetBrains Mono for the label feel.
- Do not round buttons beyond 8px; the 8px radius is the system signature — full pills are reserved for navigation links.
- Do not place colored fills (other than #6798ff on small marks) over the dark canvas; the page should read as black-and-white with one violet spark.
- Do not use #ffffff as a surface or card background except inside the inverted CTA button; white is reserved for text and primary actions.

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Canvas | `#0a0a0a` | Full-page background; the field on which all content sits |
| 1 | Card | `#141414` | Content blocks, dashboard previews, feature cards |
| 2 | Elevated | `#1e1e1` | Hover states, popovers, nested cards, table headers |
| 3 | Border | `#313131` | Hairline dividers, image outlines, field borders |
| 4 | Inverted | `#ffffff` | Filled CTA buttons, inverted text blocks |

## Elevation

Elevation is communicated through luminance contrast against the #0a0a0a canvas, not through drop shadows. Each surface level steps up by 10–15 units of brightness (#000 → #0a0a0a → #141414 → #1e1e1 → #313131), creating a quiet z-axis without visual noise. Shadows are absent from the system — depth comes from borders and tonal stepping alone.

## Imagery

The visual language is dominated by a faint blue-gray grid pattern that fills the dark canvas like architectural graph paper — it recedes into the background and provides spatial orientation without competing with content. Product preview mockups (dashboard panels, bar charts, data tables) are the primary illustrative element, rendered in the same dark palette so they feel native to the page. Icons are small, monochromatic, and outlined at ~1.5px stroke weight, occasionally accented with the #6798ff indigo for stat markers and chart legends. Customer logos in the trust strip are presented as flat monochrome marks on the dark background. There is no lifestyle photography; the product IS the hero.

## Layout

Full-bleed dark sections separated by 80px vertical gaps, all content constrained to a 1200px max-width centered container. The hero uses a two-column split: headline + subtext + dual CTAs on the left, a product dashboard preview on the right, both on the gridded dark canvas. Sections alternate between text-left/visual-right patterns and centered stat blocks (3-column grid for KPI rows with large numeric values). Navigation is a top bar with pill-shaped nav links and a high-contrast filled CTA on the far right. The footer is a multi-column link grid organized by category labels in JetBrains Mono, set against the same dark canvas without a visual separator from the page body.

## Agent Prompt Guide

**Quick Color Reference**
- text: #ffffff
- background: #0a0a0a
- card surface: #141414
- border: #1e1e1e or #313131
- accent: #6798ff
- primary action: #1e1e1e (filled action)

**3 Example Component Prompts**

1. **Hero Section**: #0a0a0a background. Headline at 64px Inter weight 500, #ffffff, letter-spacing -2.3px, max 2 lines. Subtext at 16px Inter weight 400, #a7a7a7, max-width 480px. Two buttons side by side: white-filled "Contact sales" (8px radius, 8px 16px padding, #0a0a0a text) and ghost "Try Dovetail free" (transparent, 1px #454545 border, 8px radius, #ffffff text). To the right, a #141414 dashboard preview card with 8px radius, 24px padding, containing a bar chart and data table mockup.

2. **Stat Row**: Three-column grid, centered. Each block: a #6798ff icon (24px), then 40px Inter weight 500 white number, then 16px Inter weight 500 white label, then 14px Inter weight 400 #a7a7a7 description. 32px gap between columns.

3. **Section with Eyebrow**: Centered. JetBrains Mono 12px uppercase #a7a7a7 eyebrow with +0.85px tracking, 32px gap, then 40px Inter weight 500 #ffffff heading, then optional 16px Inter weight 400 #a7a7a7 body below at max-width 640px.

**Grid Background Pattern**: On the #0a0a0a canvas, overlay a 1px grid using #1e1e1e lines at ~48px spacing. The grid is decorative — it recedes at ~5% opacity feel and provides spatial structure without competing with content.
