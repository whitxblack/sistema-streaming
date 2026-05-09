---
name: Subscription Tracker
colors:
  surface: '#16130e'
  surface-dim: '#16130e'
  surface-bright: '#3d3933'
  surface-container-lowest: '#110e09'
  surface-container-low: '#1e1b16'
  surface-container: '#231f1a'
  surface-container-high: '#2d2924'
  surface-container-highest: '#38342e'
  on-surface: '#e9e1d8'
  on-surface-variant: '#d1c5b4'
  inverse-surface: '#e9e1d8'
  inverse-on-surface: '#34302a'
  outline: '#9a8f80'
  outline-variant: '#4e4639'
  surface-tint: '#e9c176'
  primary: '#e9c176'
  on-primary: '#412d00'
  primary-container: '#c5a059'
  on-primary-container: '#4e3700'
  inverse-primary: '#775a19'
  secondary: '#c0c1ff'
  on-secondary: '#1000a9'
  secondary-container: '#3131c0'
  on-secondary-container: '#b0b2ff'
  tertiary: '#b0c6f9'
  on-tertiary: '#173059'
  tertiary-container: '#8fa5d6'
  on-tertiary-container: '#233a65'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdea5'
  primary-fixed-dim: '#e9c176'
  on-primary-fixed: '#261900'
  on-primary-fixed-variant: '#5d4201'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#b0c6f9'
  on-tertiary-fixed: '#001a41'
  on-tertiary-fixed-variant: '#304671'
  background: '#16130e'
  on-background: '#e9e1d8'
  surface-variant: '#38342e'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding-mobile: 24px
  container-padding-desktop: 64px
  gutter: 24px
  section-gap: 48px
---

## Brand & Style
The design system is rooted in the concept of "Quiet Luxury"—a design philosophy that prioritizes substance, clarity, and refined aesthetics over loud visual cues. It is tailored for a discerning audience that values financial organization without the clutter of traditional fintech interfaces.

The visual direction combines **Modern Minimalism** with **Soft Glassmorphism**. This approach uses expansive whitespace to create a sense of breathing room, while translucent layers provide a sophisticated sense of depth. The emotional goal is to evoke a feeling of "calm control," transforming the potentially stressful task of expense tracking into a serene, premium experience.

## Colors
The color palette is architected to feel timeless and expensive. The primary accent is a **Muted Gold (#C5A059)**, used sparingly to denote high-value actions and active subscription statuses.

- **Dark Mode:** Utilizes a base of Deep Charcoal (#121212) with secondary surfaces in a slightly lifted "Eerie Black" (#1A1A1A). This creates a low-fatigue environment where content floats on deep, velvety backgrounds.
- **Light Mode:** Uses a Crisp Off-White (#F9FAFB) to prevent the clinical feeling of pure white, paired with soft "Cloud Gray" borders.
- **Accents:** A secondary Muted Indigo is reserved for informational highlights (e.g., renewal dates), ensuring the Gold remains the "Hero" color for financial totals and premium features.

## Typography
This design system utilizes **Manrope** for its entire type scale. Manrope was chosen for its modern, geometric construction that maintains high legibility even at small sizes, which is critical for financial data.

- **Headlines:** Use tighter letter-spacing and heavier weights to create a sense of authority. 
- **Numerical Data:** Tabular lining should be enabled where possible to ensure that subscription prices align perfectly in vertical lists.
- **Labels:** Small labels use uppercase with increased tracking (letter-spacing) to provide an editorial, sophisticated feel to secondary metadata.

## Layout & Spacing
The layout follows a **Fluid Grid** model with an 8px baseline rhythm. To reinforce the premium feel, the design system employs "Extravagant Margins"—intentionally larger padding than standard utility apps to emphasize the minimalist aesthetic.

- **Mobile:** A 4-column grid with 24px side margins. Elements typically span the full width to maintain a focused, singular flow.
- **Desktop:** A 12-column centered grid with a maximum content width of 1200px. 
- **Rhythm:** Vertical spacing between unrelated sections should be aggressive (48px or 64px) to ensure the user's eye is never overwhelmed by information density.

## Elevation & Depth
Depth in this design system is achieved through **Optical Layering** rather than traditional heavy dropshadows.

1.  **Glassmorphism:** Navigation bars and primary "Total Spend" cards use a backdrop blur (20px to 30px) with a 10% white (Light Mode) or 5% white (Dark Mode) fill. A 1px translucent border provides a "sharp edge" to the glass.
2.  **Subtle Shadows:** When a shadow is necessary for a floating action button or a modal, it should be a "Long Soft Shadow"—a high blur radius (30px+) with very low opacity (5-8%), tinted with the background's hue to avoid a "dirty" look.
3.  **Tonal Stacking:** Higher elevation is often indicated by a slight color shift (e.g., from #121212 to #1C1C1C) rather than a shadow.

## Shapes
The shape language is defined by **Soft Geometricism**. By choosing a Roundedness level of `2`, the design system strikes a balance between the friendliness of a consumer app and the precision of a professional financial tool.

- **Buttons:** Use a fixed height (e.g., 48px or 56px) with the `rounded-lg` (1rem) token to create a "soft rectangular" look.
- **Cards:** Subscription cards use `rounded-xl` (1.5rem) to feel like physical, high-quality plastic cards.
- **Inputs:** Maintain the same corner radius as buttons to ensure a unified "form" language.

## Components
- **Buttons:** The "Primary" button is a solid Gold fill with dark text. The "Secondary" button is a Ghost style with a 1px border. All buttons should have a subtle 200ms transition on hover/active states.
- **Subscription Cards:** These are the heart of the app. They should feature a glassmorphic background, a high-resolution service icon, and the price in a bold `headline-md` style.
- **Progress Bars:** For budget tracking, use thin (4px) tracks with rounded caps. The track should be a low-opacity version of the accent color.
- **Input Fields:** Minimalist design with only a bottom border that animates to a full Gold outline upon focus. Placeholders should be in a muted gray to keep the interface clean.
- **List Items:** Subscription lists should have generous vertical padding (20px) and use thin, low-contrast separators that don't reach the edges of the screen, creating a "floating" list effect.