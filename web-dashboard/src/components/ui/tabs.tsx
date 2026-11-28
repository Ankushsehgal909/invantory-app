import { cn } from '../../utils/cn';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
}

export interface TabsProps {
  items?: TabItem[];
  options?: TabItem[];
  activeTab?: string;
  value?: string;
  onChange: (id: string) => void;
  className?: string;
  size?: 'sm' | 'default';
}

export function Tabs({ items, options, activeTab, value, onChange, className, size = 'default' }: TabsProps) {
  const tabsList = items || options || [];
  const current = activeTab || value;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-xl bg-muted/70 p-1 text-muted-foreground border border-border/50',
        className
      )}
    >
      {tabsList.map((tab) => {
        const isActive = tab.id === current;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              isActive
                ? 'bg-background text-foreground shadow-subtle font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            {Icon && <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-primary' : 'text-muted-foreground')} />}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={cn(
                  'ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-semibold leading-none',
                  isActive ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/15 text-muted-foreground'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
