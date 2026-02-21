import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        success: 'bg-success/15 text-success',
        warning: 'bg-warning/15 text-warning',
        destructive: 'bg-destructive/15 text-destructive',
        info: 'bg-info/15 text-info',
        secondary: 'bg-secondary text-secondary-foreground',
        default: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ variant, children, className, dot = true }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant }), className)}>
      {dot && (
        <span className={cn('mr-1.5 inline-block h-1.5 w-1.5 rounded-full', {
          'bg-success': variant === 'success',
          'bg-warning': variant === 'warning',
          'bg-destructive': variant === 'destructive',
          'bg-info': variant === 'info',
          'bg-secondary-foreground': variant === 'secondary',
          'bg-muted-foreground': !variant || variant === 'default',
        })} />
      )}
      {children}
    </span>
  );
}

export { statusBadgeVariants };
