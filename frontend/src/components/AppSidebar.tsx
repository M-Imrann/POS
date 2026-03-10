import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  BarChart3,
  Settings,
  ChevronLeft,
  Menu,
  Users,
  LogOut,
  User,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { isAdmin, signOut, user } = useAuth();

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/products", icon: Package, label: "Products" },
    { to: "/pos", icon: ShoppingCart, label: "POS" },
    { to: "/stock", icon: TrendingUp, label: "Stock" },
    { to: "/reports", icon: BarChart3, label: "Reports" },
    ...(isAdmin ? [{ to: "/users", icon: Users, label: "Users" }] : []),
    ...(isAdmin ? [{ to: "/admin", icon: ShieldCheck, label: "Admin Data" }] : []),
  ];

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-3">
        <button onClick={() => setCollapsed(!collapsed)} className="text-sidebar-foreground">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-bold text-sidebar-primary text-lg">StockFlow</span>
      </div>

      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-dvh bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200",
          "lg:translate-x-0 lg:static lg:z-auto",
          collapsed ? "-translate-x-full lg:w-[72px]" : "translate-x-0 lg:w-[240px]",
          "w-[240px]"
        )}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
          <span className={cn("font-bold text-sidebar-primary text-xl transition-opacity", collapsed && "lg:hidden")}>
            StockFlow
          </span>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
          >
            <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="lg:hidden text-sidebar-foreground/60"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (window.innerWidth < 1024) setCollapsed(true);
                }}
                className={isActive ? "sidebar-item-active" : "sidebar-item"}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className={cn("transition-opacity", collapsed && "lg:hidden")}>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          {user && (
            <div className={cn("px-3 py-2 text-xs text-sidebar-foreground/60 truncate", collapsed && "lg:hidden")}>
              {user.email}
            </div>
          )}
          <NavLink
            to="/profile"
            className={location.pathname === "/profile" ? "sidebar-item-active" : "sidebar-item"}
          >
            <User className="w-5 h-5 shrink-0" />
            <span className={cn("transition-opacity", collapsed && "lg:hidden")}>Profile</span>
          </NavLink>
          <NavLink
            to="/settings"
            className={location.pathname === "/settings" ? "sidebar-item-active" : "sidebar-item"}
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span className={cn("transition-opacity", collapsed && "lg:hidden")}>Settings</span>
          </NavLink>
          <button onClick={signOut} className="sidebar-item w-full text-destructive/80 hover:text-destructive">
            <LogOut className="w-5 h-5 shrink-0" />
            <span className={cn("transition-opacity", collapsed && "lg:hidden")}>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
