import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, History, Trash2, LogOut, User, Users, ShoppingCart, RotateCcw, Dumbbell, QrCode
} from "lucide-react";
import { Button } from "@/components/ui/button";

const AppSidebar = () => {
  const { role, signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const adminLinks = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { label: "Manage Items", icon: Package, path: "/admin/items" },
    { label: "Borrow History", icon: History, path: "/admin/borrows" },
    { label: "Scrap Items", icon: Trash2, path: "/admin/scrap" },
    { label: "QR Code", icon: QrCode, path: "/admin/qrcode" },
    { label: "Students", icon: Users, path: "/admin/students" },
  ];

  const studentLinks = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/student" },
    { label: "Browse Equipment", icon: ShoppingCart, path: "/student/browse" },
    { label: "My Borrows", icon: History, path: "/student/borrows" },
  ];

  const links = role === "admin" ? adminLinks : studentLinks;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="w-64 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sidebar-primary rounded-xl flex items-center justify-center">
            <Dumbbell className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              SPORTS EQUIP
            </h1>
            <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wider">
              {role === "admin" ? "Admin Panel" : "Student Portal"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </button>
          );
        })}
      </nav>

      {/* User info & logout */}
      <div className="p-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center gap-3 px-3">
          <div className="w-8 h-8 bg-sidebar-accent rounded-full flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default AppSidebar;
