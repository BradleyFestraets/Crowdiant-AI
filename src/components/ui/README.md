# Crowdiant AI UI Components

Radix UI + Tailwind component library optimized for restaurant operations. Built for accessibility (WCAG 2.1 AA compliant), performance, and consistent UX across all surfaces.

## Component Inventory

### Interactive Components
- **Button**: Primary CTA component
  - Variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
  - Sizes: `default`, `sm`, `lg`, `icon`
  - Props: `variant`, `size`, `asChild`, `disabled`
  
- **Input**: Form input with validation states
  - Types: text, email, password, number, tel, url
  - States: default, error, disabled, read-only
  - Props: Standard HTML input props + `className`

- **Select**: Dropdown selection component
  - Sub-components: `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator`
  - Props: `value`, `onValueChange`, `disabled`, `name`

### Overlay Components
- **Dialog**: Modal dialogs for critical actions
  - Sub-components: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`
  - Accessibility: Focus trap, ESC to close, click outside to close
  - Props: `open`, `onOpenChange`, `modal`

- **Tooltip**: Contextual help component
  - Sub-components: `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`
  - Props: `delayDuration`, `skipDelayDuration`, `side`, `sideOffset`, `align`

- **Toast**: Notification system for user feedback
  - Variants: `default`, `destructive`
  - Sub-components: `Toaster`, `Toast`, `ToastTitle`, `ToastDescription`, `ToastAction`, `ToastClose`
  - Hook: `useToast()` for programmatic control
  - Props: `title`, `description`, `action`, `variant`, `duration`

### Layout Components
- **Tabs**: Tab navigation for multi-view interfaces
  - Sub-components: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
  - Props: `value`, `onValueChange`, `orientation`, `activationMode`

- **Table**: Data tables for lists and grids
  - Sub-components: `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`
  - Responsive: Horizontal scroll on mobile
  - Props: Standard HTML table props + `className`

### Feedback Components
- **Skeleton**: Loading placeholders
  - Variants: Single line, paragraph block, circle (avatar)
  - Props: `className` (for custom sizing)

## Usage Examples

### Basic Button
```tsx
import { Button } from "@/components/ui/button";

<Button onClick={handleSubmit}>Submit Order</Button>
<Button variant="destructive">Cancel Order</Button>
<Button variant="outline" size="sm">Edit</Button>
```

### Form with Input + Toast
```tsx
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

<Input 
  type="email" 
  placeholder="chef@restaurant.com"
  onChange={(e) => setEmail(e.target.value)}
/>

// Show feedback
toast({
  title: "Order Submitted",
  description: "Kitchen will receive notification in 3s",
});
```

### Confirmation Dialog
```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button variant="destructive">Delete Menu Item</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Deletion</DialogTitle>
      <DialogDescription>
        This action cannot be undone. The menu item will be permanently removed.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button variant="destructive" onClick={handleDelete}>Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Accessibility Standards

All components follow WCAG 2.1 Level AA guidelines:

- **Keyboard Navigation**: Full keyboard support (Tab, Arrow keys, Enter, Space, ESC)
- **Screen Readers**: ARIA labels, roles, and live regions
- **Focus Management**: Visible focus indicators, logical focus order, focus trapping in modals
- **Color Contrast**: Minimum 4.5:1 for text, 3:1 for UI components
- **Touch Targets**: Minimum 44x44px for interactive elements

### Testing Checklist
- [ ] All interactive elements reachable via keyboard
- [ ] Screen reader announces component purpose and state
- [ ] Focus visible on all interactive elements
- [ ] Color not sole indicator of state/meaning
- [ ] Touch targets meet minimum size

## Theming

Components use CSS variables for consistent theming. See `src/styles/globals.css` for theme tokens:

- **Colors**: `--primary`, `--secondary`, `--destructive`, `--muted`, `--accent`, `--border`, `--input`, `--ring`
- **Radius**: `--radius` (default: 0.5rem)
- **Fonts**: `--font-geist-sans`, `--font-geist-mono`

## Component Guidelines

### DO
✅ Use `Button` for all clickable actions (not `<a>` or `<div onClick>`)  
✅ Provide descriptive labels for screen readers (`aria-label`, `aria-labelledby`)  
✅ Use `Toast` for non-blocking feedback, `Dialog` for critical confirmations  
✅ Compose components with Radix primitives for advanced patterns  
✅ Test with keyboard-only navigation before shipping

### DON'T
❌ Don't nest interactive elements (e.g., Button inside Button)  
❌ Don't use color alone to convey state (add icon or text)  
❌ Don't override focus styles without providing alternatives  
❌ Don't use Tooltip for critical information (use visible text)  
❌ Don't block user with modal for non-critical actions

## Live Documentation

See all components in action with interactive examples:  
**[View UI Examples →](/ui-examples)**

## Migration Notes

- **Shadcn/UI**: Components are based on Shadcn/UI patterns but customized for restaurant workflows
- **Radix Primitives**: Uses Radix UI headless components for accessibility foundation
- **Tailwind**: Uses Tailwind v4 with CSS variables for theming

---

**Questions?** Check the live examples page or see individual component source files in `src/components/ui/`.
