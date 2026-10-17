---
name: Reliability & Clarity
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#43474e'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f88'
  primary: '#002045'
  on-primary: '#ffffff'
  primary-container: '#1a365d'
  on-primary-container: '#86a0cd'
  inverse-primary: '#adc7f7'
  secondary: '#00696f'
  on-secondary: '#ffffff'
  secondary-container: '#9cedf3'
  on-secondary-container: '#036e74'
  tertiary: '#321b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#4f2e00'
  on-tertiary-container: '#d4903b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#adc7f7'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#2d476f'
  secondary-fixed: '#9ff0f6'
  secondary-fixed-dim: '#83d3da'
  on-secondary-fixed: '#002022'
  on-secondary-fixed-variant: '#004f54'
  tertiary-fixed: '#ffddba'
  tertiary-fixed-dim: '#ffb866'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  container-max: 1280px
---

## Brand & Style

The design system is built on the concept of the "Setu" (Bridge)—a reliable connection between complex insurance data and user understanding. The brand personality is authoritative and professional, reflecting the high stakes of insurance and health, yet tempered with an empathetic, approachable tone. 

The visual style follows a **Modern Corporate** aesthetic with a strong emphasis on **Minimalism** and **Card-based layouts**. It prioritizes extreme legibility and structured information density to accommodate the nuances of the Indian insurance market. The UI evokes a sense of calm efficiency, utilizing generous whitespace to prevent data overwhelm while maintaining a technical edge that signals AI-powered precision.

## Colors

The palette is anchored by **Deep Trust Blue**, signaling institutional stability and security. **Medical Teal** serves as the primary action and health-association color, providing a calming alternative to the heavy blue. **Alert Orange** is reserved strictly for high-urgency states, such as policy lapses or critical document requirements.

The background uses a subtle **Slate White (#F8FAFC)** to reduce eye strain and provide a sophisticated backdrop for white cards. Text contrast must always exceed WCAG AA standards to ensure accessibility for a wide demographic of users.

## Typography

The design system employs a dual-font strategy. **Plus Jakarta Sans** is used for headlines to provide a friendly, modern, and tech-forward character. **Inter** is used for all body text and data-heavy labels to ensure maximum legibility and a systematic, neutral feel.

For bilingual support (English/Hindi), line heights are increased by 10% when Hindi text is present to accommodate the script's vertical reach without crowding the layout. Headlines use tight letter-spacing for a modern "editorial" look, while labels use slight tracking for clarity at small sizes.

## Layout & Spacing

This design system utilizes a **12-column fluid grid** for desktop and a **4-column grid** for mobile. The spacing rhythm is based on a **4px baseline grid** to ensure mathematical harmony across all components.

- **Desktop:** 12 columns, 24px gutters, and 48px outer margins. Cards often span 4 columns (3-up) or 6 columns (2-up).
- **Tablet:** 8 columns, 16px gutters, and 32px margins.
- **Mobile:** 4 columns, 16px gutters, and 16px margins. 

The "Setu" concept is reinforced through vertical stack layouts that guide the eye downward through the decision-making process. Dashboard layouts use a sidebar for primary navigation and a flexible main stage for dynamic intelligence cards.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Ambient Shadows**. The design avoids heavy black shadows in favor of tinted, diffused shadows that feel integrated into the environment.

- **Level 0 (Base):** Slate White background (#F8FAFC).
- **Level 1 (Cards):** Pure White surface with a 1px border (#E2E8F0) and a soft, low-opacity shadow (4px blur, 2% Primary Color).
- **Level 2 (Interactive):** On hover, cards lift with a more pronounced shadow (12px blur, 6% Primary Color) and a slightly darker border.
- **Level 3 (Modals/Overlays):** Significant depth with a 24px blur shadow and a background backdrop blur (8px) to focus the user on the task at hand.

Shadows are always tinted with the Primary Blue to maintain a cohesive professional tone and avoid a "dirty" gray appearance.

## Shapes

The shape language uses **Rounded** corners to project approachability and modernity. 

- **Standard Elements (Buttons, Inputs, Cards):** 8px (0.5rem) radius.
- **Large Containers (Sections, Dashboard Modules):** 16px (1rem) radius.
- **Full Rounded (Status Chips, AI Chat Bubbles):** 9999px for a "pill" look that distinguishes them from structural elements.

The 8px corner radius strikes the balance between the precision of a 0px "sharp" corner and the informal nature of a 16px+ "pill" shape, aligning perfectly with the authoritative yet empathetic brand voice.

## Components

### AI Chat Widget (Unified Setu)
The signature component is a persistent, circular floating action button in **Medical Teal**. When expanded, it uses a full-height side panel with a message-stream layout. AI responses are housed in Level 1 white bubbles, while user messages use a Level 2 Deep Trust Blue bubble.

### Action Buttons
- **Primary:** Solid Medical Teal background with White text. Bold, 8px radius.
- **Secondary:** Transparent background, 1.5px Deep Trust Blue border, Blue text.
- **Urgent:** Solid Alert Orange background for high-priority claims or alerts.

### Dashboard Cards
Cards use a Level 1 elevation. Titles are Headline-MD in Deep Trust Blue. They must include a subtle "footer" area for secondary actions or timestamp metadata.

### Status Indicators
Small, pill-shaped chips with low-opacity background fills of the status color:
- **Active/Approved:** Teal (10% opacity) with Teal text.
- **Pending:** Blue (10% opacity) with Blue text.
- **Action Required:** Orange (10% opacity) with Orange text.

### Inputs & Selectors
Fields use a 1px Slate border that shifts to Medical Teal on focus. Labels are in Inter Bold (Label-SM) and always sit above the input field for maximum clarity. All forms should include bilingual sub-labels (Hindi) in a lighter weight where necessary.