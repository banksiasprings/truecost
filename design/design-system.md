# TRUE COST — Design System

## Philosophy
UI and logic are completely separated. To retheme the entire app, edit ONLY src/css/theme.css.
layout.css and components.css NEVER contain raw colour values — only var(--xxx) references.

## Colour Palette (theme.css variables)
--color-brand:        #2D5016  (dark olive green — primary brand)
--color-accent:       #E8572A  (terracotta orange — CTAs, highlights)
--color-bg:           #FAFAF8  (warm off-white — page background)
--color-surface:      #FFFFFF  (white — cards, modals)
--color-text:         #1C1C1E  (near black — primary text)
--color-text-muted:   #6B7280  (medium grey — secondary text)
--color-border:       #E5E7EB  (light grey — dividers, borders)
--color-success:      #16A34A  (green — positive states, EV savings)
--color-danger:       #DC2626  (red — destructive, high cost warning)
--color-warning:      #D97706  (amber — caution states)

## Typography
--font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif
--font-size-xs:   11px  (labels, badges)
--font-size-sm:   13px  (secondary text, captions)
--font-size-base: 15px  (body)
--font-size-md:   17px  (section headings)
--font-size-lg:   22px  (page headings)
--font-size-xl:   28px  (hero numbers, cost totals)

## Spacing Scale
--space-xs: 4px
--space-sm: 8px
--space-md: 16px
--space-lg: 24px
--space-xl: 40px

## Border Radius
--radius-sm:  8px   (inputs, small elements)
--radius-md:  14px  (cards, modals)
--radius-lg:  20px  (bottom sheets)
--radius-pill: 999px (tags, badges, pill buttons)

## Shadows
--shadow-card: 0 2px 8px rgba(0,0,0,0.10)
--shadow-modal: 0 8px 32px rgba(0,0,0,0.18)

## Component Specs

### Buttons
Primary CTA: bg var(--color-accent), white text, height 48px, radius var(--radius-sm), full-width
Secondary: white bg, var(--color-brand) border + text, same dimensions
Destructive: var(--color-danger) bg, white text
Pill/tag: radius var(--radius-pill), height 32px, small padding

### Cards
bg var(--color-surface), shadow var(--shadow-card), radius var(--radius-md)
padding var(--space-lg)
Card title: left border 3px solid var(--color-brand)

### Bottom Nav
bg var(--color-surface), border-top 1px var(--color-border)
Active: var(--color-brand) icon + label
Inactive: var(--color-text-muted)
Label: 11px, icon: 22px

### Form Inputs
border: 1.5px solid var(--color-border)
focus: 1.5px solid var(--color-brand), box-shadow 0 0 0 3px rgba(45,80,22,0.12)
height: 44px, radius: var(--radius-sm)
Label: uppercase, 11px, var(--color-text-muted), letter-spacing 0.8px

### Status Badges
Paid/Saved: var(--color-success) tint bg, var(--color-success) text
Warning: var(--color-warning) tint bg
Danger: var(--color-danger) tint bg
font-size: 11px, font-weight: 600, radius: var(--radius-pill)

## Screen Hierarchy
1. Home (vehicle list + quick compare)
2. Add Vehicle (step 1: identity > step 2: purchase > step 3: fuel > step 4: costs > step 5: review)
3. Comparison View (2-4 vehicles side by side)
4. Vehicle Detail / Cost Breakdown
5. Scenario Modeller (sliders for years/km, live chart update)
6. Report / Export
7. Settings (global defaults)
