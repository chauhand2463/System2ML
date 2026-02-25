import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:scale-[1.02] active:scale-[0.98] cursor-pointer select-none",
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:from-brand-600 hover:to-brand-700 border-0',
        destructive:
          'bg-gradient-to-r from-danger-500 to-danger-600 text-white shadow-lg shadow-danger-500/25 hover:shadow-danger-500/40 hover:from-danger-600 hover:to-danger-700 border-0',
        outline:
          'border-2 border-white/20 bg-transparent text-white hover:bg-white/10 hover:border-white/30 shadow-sm',
        secondary:
          'bg-gradient-to-r from-neutral-600 to-neutral-700 text-white shadow-lg shadow-neutral-500/10 hover:from-neutral-500 hover:to-neutral-600 border-0',
        ghost:
          'text-white hover:text-white hover:bg-white/10 shadow-none',
        link: 'text-brand-400 underline-offset-4 hover:underline hover:text-brand-300',
        success: 'bg-gradient-to-r from-success-500 to-success-600 text-white shadow-lg shadow-success-500/25 hover:shadow-success-500/40 hover:from-success-600 hover:to-success-700 border-0',
        warning: 'bg-gradient-to-r from-warning-500 to-warning-600 text-white shadow-lg shadow-warning-500/25 hover:shadow-warning-500/40 hover:from-warning-600 hover:to-warning-700 border-0',
      },
      size: {
        default: 'h-10 px-5 py-2.5 has-[>svg]:px-4',
        sm: 'h-8 rounded-lg gap-1.5 px-3.5 has-[>svg]:px-3 text-xs',
        lg: 'h-12 rounded-lg px-8 has-[>svg]:px-5 text-base',
        xl: 'h-14 rounded-xl px-10 has-[>svg]:px-6 text-lg',
        icon: 'size-10 rounded-lg',
        'icon-sm': 'size-8 rounded-md',
        'icon-lg': 'size-12 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
