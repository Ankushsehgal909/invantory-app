import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Badge } from './badge';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
    period?: string;
  };
  accentColor?: 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'indigo' | 'teal' | 'orange' | 'sky' | 'emerald' | 'zinc' | string;
  colorScheme?: 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'indigo' | 'teal' | 'orange' | 'sky' | 'emerald' | 'zinc';
  progress?: number;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info';
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  description,
  icon: Icon,
  trend,
  accentColor,
  colorScheme = 'blue',
  progress,
  badge,
  badgeVariant,
  onClick,
  className,
}: StatCardProps) {
  const effectiveScheme = (accentColor || colorScheme || 'blue') as string;

  const schemeStyles: Record<string, { iconBg: string; border: string; progress: string }> = {
    blue: {
      iconBg: 'bg-sky-500/10 text-sky-600 border-sky-500/20 group-hover:bg-sky-500 group-hover:text-white',
      border: 'hover:border-sky-500/40',
      progress: 'bg-sky-500',
    },
    sky: {
      iconBg: 'bg-sky-500/10 text-sky-600 border-sky-500/20 group-hover:bg-sky-500 group-hover:text-white',
      border: 'hover:border-sky-500/40',
      progress: 'bg-sky-500',
    },
    green: {
      iconBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white',
      border: 'hover:border-emerald-500/40',
      progress: 'bg-emerald-500',
    },
    emerald: {
      iconBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white',
      border: 'hover:border-emerald-500/40',
      progress: 'bg-emerald-500',
    },
    purple: {
      iconBg: 'bg-purple-500/10 text-purple-600 border-purple-500/20 group-hover:bg-purple-500 group-hover:text-white',
      border: 'hover:border-purple-500/40',
      progress: 'bg-purple-500',
    },
    amber: {
      iconBg: 'bg-amber-500/10 text-amber-600 border-amber-500/20 group-hover:bg-amber-500 group-hover:text-white',
      border: 'hover:border-amber-500/40',
      progress: 'bg-amber-500',
    },
    rose: {
      iconBg: 'bg-rose-500/10 text-rose-600 border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white',
      border: 'hover:border-rose-500/40',
      progress: 'bg-rose-500',
    },
    indigo: {
      iconBg: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white',
      border: 'hover:border-indigo-500/40',
      progress: 'bg-indigo-500',
    },
    teal: {
      iconBg: 'bg-teal-500/10 text-teal-600 border-teal-500/20 group-hover:bg-teal-500 group-hover:text-white',
      border: 'hover:border-teal-500/40',
      progress: 'bg-teal-500',
    },
    orange: {
      iconBg: 'bg-orange-500/10 text-orange-600 border-orange-500/20 group-hover:bg-orange-500 group-hover:text-white',
      border: 'hover:border-orange-500/40',
      progress: 'bg-orange-500',
    },
    zinc: {
      iconBg: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20 group-hover:bg-zinc-500 group-hover:text-white',
      border: 'hover:border-zinc-500/40',
      progress: 'bg-zinc-500',
    },
  };

  const scheme = schemeStyles[effectiveScheme] || schemeStyles.blue;
  const bottomText = description || subtitle;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/80 bg-card p-5 text-card-foreground shadow-subtle transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated',
        scheme.border,
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {title}
            </span>
            {badge && (
              <Badge variant={badgeVariant || 'default'} className="text-[10px] px-1.5 py-0">
                {badge}
              </Badge>
            )}
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl truncate">
            {value}
          </div>
        </div>

        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 shadow-xs',
            scheme.iconBg
          )}
        >
          <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
        </div>
      </div>

      {(trend || bottomText || typeof progress === 'number') && (
        <div className="mt-4 pt-3 border-t border-border/40 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            {trend && (
              <div className="flex items-center gap-1.5 font-medium">
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold',
                    trend.isPositive !== false
                      ? 'bg-emerald-500/10 text-emerald-700'
                      : 'bg-rose-500/10 text-rose-700'
                  )}
                >
                  {trend.isPositive !== false ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {trend.value}
                </span>
                {(trend.period || trend.label) && (
                  <span className="text-muted-foreground">{trend.period || trend.label}</span>
                )}
              </div>
            )}

            {bottomText && !trend && (
              <span className="text-xs text-muted-foreground truncate">{bottomText}</span>
            )}

            {typeof progress === 'number' && (
              <span className="text-xs font-medium text-muted-foreground ml-auto">{progress}%</span>
            )}
          </div>

          {typeof progress === 'number' && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn('h-full rounded-full transition-all duration-500', scheme.progress)}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
