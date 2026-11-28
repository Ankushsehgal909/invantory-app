import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Package,
  ShoppingCart,
  Truck,
  Users,
  FileText,
  Settings,
  Plus,
  ArrowRight,
  X,
} from 'lucide-react';

export interface CommandDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CommandDialog({ open, onClose }: CommandDialogProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) onClose();
      } else if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const items = [
    { label: 'Dashboard', href: '/', icon: Package, category: 'Navigation' },
    { label: 'Products Catalog', href: '/products', icon: Package, category: 'Navigation' },
    { label: 'Add New Product', href: '/products?new=true', icon: Plus, category: 'Actions' },
    { label: 'Sales & Invoices', href: '/sales', icon: ShoppingCart, category: 'Navigation' },
    { label: 'New Sale / POS', href: '/sales?new=true', icon: Plus, category: 'Actions' },
    { label: 'Purchases & Restock', href: '/purchases', icon: Truck, category: 'Navigation' },
    { label: 'Record Restock Purchase', href: '/purchases?new=true', icon: Plus, category: 'Actions' },
    { label: 'Customers Directory', href: '/customers', icon: Users, category: 'Navigation' },
    { label: 'Suppliers Directory', href: '/suppliers', icon: Truck, category: 'Navigation' },
    { label: 'Reports & P&L', href: '/reports', icon: FileText, category: 'Navigation' },
    { label: 'Store Settings', href: '/settings', icon: Settings, category: 'Navigation' },
  ];

  const filteredItems = query.trim()
    ? items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()) || item.category.toLowerCase().includes(query.toLowerCase()))
    : items;

  if (!open) return null;

  const handleSelect = (href: string) => {
    navigate(href);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card text-card-foreground border border-border/80 rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-border/60">
          <Search className="w-5 h-5 text-muted-foreground mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, products, navigation..."
            className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          {query ? (
            <button onClick={() => setQuery('')} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[10px] font-semibold text-muted-foreground">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No matching pages or commands found for "{query}"
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => handleSelect(item.href)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/40 bg-muted/30 text-xs text-muted-foreground">
          <span>Navigate with arrows or click</span>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/70 text-[10px]">ESC</kbd>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const CommandPalette = CommandDialog;
