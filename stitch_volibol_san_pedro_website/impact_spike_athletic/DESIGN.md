---
name: Impact Spike Athletic
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#e7bcba'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#ae8885'
  outline-variant: '#5d3f3d'
  surface-tint: '#ffb3af'
  primary: '#ffb3af'
  on-primary: '#68000e'
  primary-container: '#d90429'
  on-primary-container: '#ffeae8'
  inverse-primary: '#bf0022'
  secondary: '#ffb3b1'
  on-secondary: '#680011'
  secondary-container: '#d6022e'
  on-secondary-container: '#ffe7e5'
  tertiary: '#bbc7dd'
  on-tertiary: '#253142'
  tertiary-container: '#616d81'
  on-tertiary-container: '#e8efff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad7'
  primary-fixed-dim: '#ffb3af'
  on-primary-fixed: '#410005'
  on-primary-fixed-variant: '#930018'
  secondary-fixed: '#ffdad8'
  secondary-fixed-dim: '#ffb3b1'
  on-secondary-fixed: '#410007'
  on-secondary-fixed-variant: '#92001c'
  tertiary-fixed: '#d7e3fa'
  tertiary-fixed-dim: '#bbc7dd'
  on-tertiary-fixed: '#101c2c'
  on-tertiary-fixed-variant: '#3c475a'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-xl:
    fontFamily: Anton
    fontSize: 72px
    fontWeight: '400'
    lineHeight: 76px
    letterSpacing: 0.02em
  display-xl-mobile:
    fontFamily: Anton
    fontSize: 44px
    fontWeight: '400'
    lineHeight: 48px
    letterSpacing: 0.02em
  headline-lg:
    fontFamily: Anton
    fontSize: 40px
    fontWeight: '400'
    lineHeight: 44px
    letterSpacing: 0.03em
  headline-lg-mobile:
    fontFamily: Anton
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: 0.03em
  headline-md:
    fontFamily: Anton
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: 0.04em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Space Grotesk
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Space Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.08em
  label-md:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.06em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.1em
  score-display:
    fontFamily: Anton
    fontSize: 56px
    fontWeight: '400'
    lineHeight: 56px
    letterSpacing: 0.01em
spacing:
  gutter: 1.25rem
  gutter-desktop: 2rem
  margin: 1rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
  space-2xl: 4rem
---

## Brand & Style

This design system channels the raw velocity, tactical discipline, and visceral excitement of competitive volleyball. Built for players, fans, coaching staff, and athletic recruiters, the interface balances high-impact kinetic energy with clear tournament data presentation. 

Drawing from modern athletic brutalism fused with high-contrast performance design, the visual atmosphere is electric, focused, and aggressive. Crisp pitch-black and deep carbon backdrops make searing crimson and scarlet reds leap forward, mimicking indoor arena floodlights slicing through shadows. Layouts prioritize speed of consumption: instant match status, sharp team statistics, and rapid-fire roster updates. Structural lines incorporate dynamic 4-degree to 6-degree forward-leaning angles and directional speed trails derived from the ball trajectory in the club crest, communicating forward motion, momentum, and competitive hunger.

## Colors

The system operates primarily in a bold, stadium-inspired dark mode that highlights athletic intensity and minimizes eye fatigue during live scoring and tournament tracking. 

- **Primary Crimson (`#D90429`):** The beating heart of the club. Reserved for primary calls-to-action, key score counters, dynamic indicators, and victory milestones.
- **Secondary Bright Scarlet (`#EF233C`):** Used for live match status tags ("LIVE SET", "MATCH POINT"), interactive hover states, energetic gradient edge-lines, and high-impact hero banners.
- **Tertiary Stadium Steel (`#8D99AE`):** A cool, slate-toned grey used for secondary statistics, table dividing rules, supporting iconography, and inactive league standings data.
- **Neutral Abyss Black (`#111111`) & Carbon Surface (`#1E1E24`):** Provide deep, grounded contrast, allowing the vibrant crimson tones and pure white typography to command immediate focus.
- **Pitch White (`#FFFFFF`):** High-clarity text, primary numerals, and boundary line highlights.

## Typography

Typography embodies the force and condensed verticality of a spike at the net. 

- **Headlines & Scores:** Rendered in **Anton**, an imposing condensed powerhouse. All primary titles and scoreboard tallies should appear in uppercase (`text-transform: uppercase`) with subtle tracking to evoke athletic jersey lettering and arena jumbotrons.
- **Body & Numerical Analytics:** Driven by **Space Grotesk**, blending modern tech precision with rapid legibility. Its geometric quirks reinforce modern athleticism without sacrificing data clarity in tight league tables or stat sheets.
- **Labels, Badges & Micro-Copy:** Styled in bold uppercase with expanded letter-spacing to ensure absolute legibility even when superimposed on fast-moving imagery or high-contrast match backgrounds.

## Layout & Spacing

The layout is built upon an assertive 12-column responsive grid engineered for dense athletic dashboards, broadcast-style media layouts, and multi-tier fixture calendars.

- **Desktop (1024px+):** 12-column layout with 2rem (32px) gutters and 3rem (48px) safe margins. Cards and scoreboard panels snap to hard modular increments.
- **Tablet (768px - 1023px):** 8-column layout with 1.5rem (24px) gutters. Complex match overviews collapse into stacked team cards.
- **Mobile (< 768px):** 4-column layout with 1.25rem (20px) gutters and 1rem (16px) margins. Tables convert to horizontally scrollable modules or segmented swipe cards.

Spacing emphasizes decisive groupings: compact internal component padding paired with generous macro-spacing between sections, creating dramatic breathing room that lets explosive graphics and crimson accents command focus.

## Elevation & Depth

Rather than conventional soft office shadows, depth is communicated through high-contrast structural layering, hard athletic borders, and crimson energy halos.

- **Base Surface:** Solid `#111111`.
- **Card & Module Surfaces:** Solid `#1E1E24` framed with subtle 1px structural outlines (`rgba(255, 255, 255, 0.08)`).
- **Active & Highlight Depth:** Sharp 2px offset borders in `#D90429` with a zero-blur drop: `box-shadow: 4px 4px 0px 0px #D90429`. This gives buttons and featured cards a tactile, retro-modern sporting poster presence.
- **Stadium Glow:** On live scores, active sets, or win streaks, apply a targeted atmospheric aura: `box-shadow: 0px 0px 24px -4px rgba(217, 4, 41, 0.35)`.
- **Overlays & Modals:** Deep black at 85% opacity with an intense backdrop blur (`16px`) to isolate lineup builders and video playback from the background.

## Shapes

The shape system adopts a strict, sharp, zero-radius philosophy (`roundedness: 0`). 

Curved elements are eliminated in favor of clean, athletic precision and chiseled edges. Diagonal cuts (chamfered 45-degree corner clippings via `clip-path: polygon(...)`) are utilized on hero score badges, team crest containers, and primary action buttons. This geometry recalls court lines, nets, speed trails, and the aggressive angled trajectory of an overhand spike.

## Components

### Buttons
- **Primary Action:** Solid `#D90429`, pure white uppercase Anton or Space Grotesk Bold text, zero border-radius. On hover: shifts background to `#EF233C`, translating 2px up and left with a 4px black/white offset drop shadow.
- **Secondary (Tactical):** Transparent background, 2px solid `#FFFFFF`, text `#FFFFFF`. Hover state fills with `#FFFFFF` and turns text to `#111111`.
- **Ghost / Minimal:** Transparent background, text `#8D99AE`. Hover state transitions text to `#EF233C` with an underline spanning 100% width.

### High-Contrast Badges & Status Chips
- Chamfered rectangular shapes.
- **Live Match:** Solid `#EF233C` background with white text accompanied by a flashing 6px white dot.
- **Category / Division:** Inverted outline with `#8D99AE` text and 1px border.

### Scoreboard Panels
- Dark `#1E1E24` dual-cell layout separated by a hard vertical rule.
- Club initials and crest on the left, opposing club on the right.
- Scores rendered in massive 56px **Anton** tabular numerals.
- Set-by-set breakdown positioned below in compact tabular pills (`#111111` background with `#8D99AE` text, highlighting the winning set in `#D90429`).

### League Standings Table
- Alternating zebra rows using `#111111` and `#18181D`.
- Left-edge accent: Position 1-3 highlighted with a 3px solid `#D90429` left border (championship/promotion zone).
- Monospaced numerical alignment for Points (PTS), Sets Won (SW), Sets Lost (SL), and Ratio.

### Cards & Media Tiles
- Zero corner radius. Dark grey background (`#1E1E24`).
- Card imagery uses a subtle duotone treatment (black & white with red midtone grading) that bursts into full natural color on hover.
- Title badges sit within an angled bottom banner that cuts diagonally across the base of the image.

### Form Inputs & Selectors
- Solid `#16161A` input fields with a 1px border in `#8D99AE`.
- On focus: border shifts instantly to 2px solid `#D90429` with zero radius and no default browser glow.
- Checkboxes and radio buttons are sharp squares; checked states feature a solid `#D90429` fill with an inner white graphic indicator.