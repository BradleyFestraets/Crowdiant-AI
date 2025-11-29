# Crowdiant UI Components

Location: `src/components/ui`

## Components
- Button: Variant + size via class-variance-authority
- Input: Basic text input styles
- Dialog: Accessible modal using Radix UI
- Tabs: Accessible tabs using Radix UI
- Tooltip: Accessible tooltip using Radix UI
- Toast: Minimal provider with `useToast()`

## Usage
Import with path aliases (`~/` or `@/`):
```tsx
import Button from "~/components/ui/button";
```

## Theming
Tailwind v4 `@theme` tokens in `src/styles/globals.css` provide semantic colors. Light/dark is controlled by the `dark` class on `html`. A `ThemeToggle` is included in `src/app/layout.tsx` and persists user choice in `localStorage`.

## Accessibility
Radix primitives handle focus management and ARIA attributes for Dialog, Tabs, Tooltip. Ensure descriptive labels and keyboard support when composing components.

## Notes
- Keep APIs small and composable; avoid inline ad-hoc styles.
- Extend components here to maintain consistency across the app.
