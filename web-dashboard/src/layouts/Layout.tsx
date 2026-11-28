import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Menu,
  X,
  Bell,
  LogOut,
  ChevronDown,
  Home,
  Package,
  ShoppingCart,
  Users,
  Truck,
  FileText,
  Settings,
  Search,
  CheckCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { api, apiHelpers } from '../services/api';
import { Notification } from '@shopstock/shared/types';
import { CommandDialog } from '../components/ui/command-dialog';
import { cn } from '../utils/cn';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/', icon: Home },
    ],
  },
  {
    title: 'Inventory & Operations',
    items: [
      { name: 'Products', href: '/products', icon: Package },
      { name: 'Purchases', href: '/purchases', icon: Truck },
      { name: 'Sales', href: '/sales', icon: ShoppingCart },
    ],
  },
  {
    title: 'Partners & Directory',
    items: [
      { name: 'Customers', href: '/customers', icon: Users },
      { name: 'Suppliers', href: '/suppliers', icon: Truck },
    ],
  },
  {
    title: 'Analytics & System',
    items: [
      { name: 'Reports', href: '/reports', icon: FileText },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Close menus on route change
  useEffect(() => {
    setSidebarOpen(false);
    setUserMenuOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  // Fetch notifications
  const { data: notificationsData, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiHelpers.getNotifications({ limit: 10 }),
    select: (response) => response.data.data.notifications,
    refetchInterval: 30000,
    enabled: !!user,
  });

  useEffect(() => {
    if (notificationsData) {
      setNotifications(notificationsData);
      setUnreadCount(
        notificationsData.filter((n: Notification) => n.status === 'PENDING' || n.status === 'SENT').length
      );
    }
  }, [notificationsData]);

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.status === 'PENDING' || notification.status === 'SENT') {
      try {
        await api.post(`/notifications/${notification.id}/read`);
        refetchNotifications();
      } catch (err) {
        // silent fail
      }
    }
    setNotificationsOpen(false);

    switch (notification.entityType) {
      case 'Product':
        navigate(`/products/${notification.entityId}`);
        break;
      case 'Batch':
        navigate(`/products/${notification.entityId}?tab=batches`);
        break;
      case 'SalesInvoice':
        navigate(`/sales/${notification.entityId}`);
        break;
      case 'Purchase':
        navigate(`/purchases/${notification.entityId}`);
        break;
      case 'Customer':
        navigate(`/customers/${notification.entityId}`);
        break;
      case 'Supplier':
        navigate(`/suppliers/${notification.entityId}`);
        break;
      default:
        navigate('/');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      refetchNotifications();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark notifications as read');
    }
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Global Command Palette */}
      <CommandDialog
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-sky-400 flex items-center justify-center text-white shadow-sm ring-2 ring-primary-500/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-foreground">ShopStock</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Pro
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">Inventory & Retail</p>
            </div>
          </div>
          <button
            className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-thin">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {section.title}
              </p>
              <div className="space-y-0.5 pt-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                          isActive
                            ? 'bg-primary text-white shadow-sm shadow-primary/20'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-3">
                            <Icon
                              className={cn(
                                'w-4 h-4 transition-transform duration-150 group-hover:scale-110',
                                isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'
                              )}
                            />
                            <span>{item.name}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={cn(
                                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                                isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer User Card */}
        <div className="p-3 border-t border-border/60 bg-muted/20">
          <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/70 shadow-subtle">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs ring-1 ring-primary-500/20">
                  {userInitials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{user?.name || 'Store Owner'}</p>
                <p className="text-[10px] text-muted-foreground capitalize truncate">{user?.role?.toLowerCase() || 'Admin'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Sticky Header with Backdrop Blur */}
        <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60 transition-all">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 flex-1">
              {/* Mobile menu toggle */}
              <button
                className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* 21st.dev Style Quick Search Trigger */}
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                className="hidden sm:flex items-center justify-between w-full max-w-sm px-3.5 py-1.5 bg-muted/40 hover:bg-muted/70 text-muted-foreground border border-border/60 hover:border-border rounded-xl text-xs transition-all shadow-subtle group"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span>Search products, customers, commands...</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-semibold text-muted-foreground shadow-xs">
                    Ctrl
                  </kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-semibold text-muted-foreground shadow-xs">
                    K
                  </kbd>
                </div>
              </button>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2.5">
              {/* Store Status Indicator */}
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-xs font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>Live Store</span>
              </div>

              {/* Notifications Button */}
              <div className="relative">
                <button
                  type="button"
                  className={cn(
                    'relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors border border-transparent hover:border-border/50',
                    notificationsOpen && 'bg-muted text-foreground border-border/70'
                  )}
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-background" />
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border/80 rounded-2xl shadow-2xl py-2 z-50 animate-scale-in">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[10px] font-semibold">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          className="flex items-center gap-1 text-xs text-primary hover:text-primary-600 font-medium transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAllRead();
                          }}
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-border/40 scrollbar-thin">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center text-muted-foreground text-xs space-y-1">
                          <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                          <p className="font-medium text-foreground">All caught up!</p>
                          <p>No new notifications at this time.</p>
                        </div>
                      ) : (
                        notifications.map((notification) => {
                          const isUnread = notification.status === 'PENDING' || notification.status === 'SENT';
                          return (
                            <button
                              key={notification.id}
                              className={cn(
                                'w-full px-4 py-3 text-left hover:bg-muted/40 transition-colors flex items-start gap-3 group',
                                isUnread ? 'bg-primary-50/40' : 'opacity-85'
                              )}
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div
                                className={cn(
                                  'w-2 h-2 mt-1.5 rounded-full shrink-0',
                                  isUnread ? 'bg-primary-600 ring-2 ring-primary-500/20' : 'bg-muted-foreground/30'
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-[10px] text-muted-foreground/80 mt-1">
                                  {new Date(notification.createdAt).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  className={cn(
                    'flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent hover:border-border/60 transition-colors',
                    userMenuOpen && 'bg-muted border-border/70 text-foreground'
                  )}
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs ring-1 ring-primary-500/20">
                    {userInitials}
                  </div>
                  <span className="hidden sm:inline-block text-xs font-medium text-foreground">
                    {user?.name || 'Account'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-card border border-border/80 rounded-2xl shadow-xl py-1.5 z-50 animate-scale-in">
                    <div className="px-3.5 py-2 border-b border-border/60">
                      <p className="text-xs font-semibold text-foreground truncate">{user?.name}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{user?.role?.toLowerCase()} Account</p>
                    </div>
                    <div className="p-1 space-y-0.5">
                      <button
                        className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-foreground hover:bg-accent rounded-lg flex items-center gap-2.5 transition-colors"
                        onClick={() => {
                          navigate('/settings');
                          setUserMenuOpen(false);
                        }}
                      >
                        <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Settings</span>
                      </button>
                      <button
                        className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2.5 transition-colors"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>

      {/* Backdrop for closing open menus */}
      {(notificationsOpen || userMenuOpen) && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => {
            setNotificationsOpen(false);
            setUserMenuOpen(false);
          }}
        />
      )}
    </div>
  );
}
