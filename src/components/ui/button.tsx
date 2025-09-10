import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-primary hover:bg-primary-hover active:bg-primary-active hover:shadow-lg active:scale-[0.98]",
        secondary: "bg-secondary text-secondary-foreground shadow-success hover:bg-secondary-hover active:bg-secondary-active hover:shadow-lg active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md active:scale-[0.98]",
        ghost: "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
        
        /* Design System - Feature Variants */
        breathing: "bg-breathing-primary text-white shadow-md hover:bg-breathing-primary/90 hover:shadow-lg active:scale-[0.98] hover:shadow-breathing-primary/30",
        sounds: "bg-sounds-primary text-white shadow-md hover:bg-sounds-primary/90 hover:shadow-lg active:scale-[0.98]",
        evolution: "bg-evolution-primary text-white shadow-md hover:bg-evolution-primary/90 hover:shadow-lg active:scale-[0.98]",
        sos: "bg-sos-primary text-white shadow-md hover:bg-sos-primary/90 hover:shadow-lg active:scale-[0.98] animate-pulse-gentle",
        
        /* Soft variants for better accessibility */
        "primary-soft": "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:border-primary/30 active:scale-[0.98]",
        "secondary-soft": "bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20 hover:border-secondary/30 active:scale-[0.98]",
        "success-soft": "bg-success/10 text-success border border-success/20 hover:bg-success/20 hover:border-success/30 active:scale-[0.98]",
      },
      size: {
        default: "h-11 px-6 py-2.5 text-sm",
        sm: "h-9 rounded-lg px-4 text-sm",
        lg: "h-12 rounded-xl px-8 text-base font-semibold",
        xl: "h-14 rounded-xl px-10 text-lg font-semibold",
        icon: "h-10 w-10 rounded-lg",
        "icon-sm": "h-8 w-8 rounded-md",
        "icon-lg": "h-12 w-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
