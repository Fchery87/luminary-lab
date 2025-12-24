# Components Directory - UI Components

## Package Identity
- **Purpose**: Reusable UI components with Radix UI primitives
- **Technology**: TypeScript, React, Tailwind CSS, Radix UI

## Setup & Run
Components are imported directly, no separate setup needed:
```typescript
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
```

## Patterns & Conventions

### Component Structure
```
src/components/ui/
├── button.tsx          # Button component
├── card.tsx           # Card component
├── input.tsx           # Input component
├── label.tsx           # Label component
├── radio-group.tsx      # Radio group
├── slider.tsx          # Slider component
├── progress.tsx        # Progress component
├── badge.tsx           # Badge component
└── index.ts           # Export all components
```

### Component Pattern
```typescript
// ✅ DO: Forward refs properly
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors",
          {
            "bg-primary text-primary-foreground hover:bg-primary/90": variant === "default",
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground": variant === "outline",
          },
          {
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3": size === "sm",
            "h-11 rounded-md px-8": size === "lg",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
```

### Radix UI Integration
```typescript
// ✅ DO: Use Radix primitives with proper styling
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  );
});
```

## Touch Points / Key Files
```
- UI primitives: src/components/ui/button.tsx, card.tsx, input.tsx
- Radix components: src/components/ui/radio-group.tsx, slider.tsx
- Utility exports: src/components/ui/index.ts
- Style utilities: src/lib/utils.ts
```

## JIT Index Hints
```bash
# Find all UI components
find src/components/ui -name "*.tsx"

# Find component usage
rg -n "import.*Button" src/app

# Search component definitions
rg -n "interface.*Props" src/components/ui

# Find Radix usage
rg -n "@radix-ui" src/components/ui
```

## Common Gotchas
- **Always forward ref** for better composition
- **Use cn() utility** for conditional classes
- **Extend HTML element props** for flexibility
- **Use displayName** for debugging
- **Variant props** should have sensible defaults

## Pre-PR Checks
```bash
# Type check components
bunx tsc --noEmit

# Test component rendering (if tests exist)
bun test src/components
```

### Component Examples
```typescript
// ✅ DO: Copy button pattern
// Component: src/components/ui/button.tsx

// ✅ DO: Copy card pattern  
// Component: src/components/ui/card.tsx

// ✅ DO: Use in pages
import { Button, Card } from '@/components/ui';

<Button variant="outline" size="sm">
  Click me
</Button>

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
</Card>
```
