import {
  BarChart3,
  LineChart,
  CircleDollarSign,
  Dumbbell,
  Home,
  MessageSquare,
  PackageOpen,
  Settings,
  Soup,
  Users,
  Wallet,
} from "lucide-react";



export const navItems = [
  { label: "Dashboard Overview", href: "/dashboard", icon: Home },
  { label: "User Management", href: "/user-management", icon: Users },
  { label: "Program Management", href: "/program-management", icon: PackageOpen },
  { label: "Exercise Library", href: "/exercise-library", icon: Dumbbell },
  { label: "Recipes Management", href: "/recipes-management", icon: Soup },
  { label: "Subscription Management", href: "/subscription-management", icon: Wallet },
  { label: "Revenue", href: "/revenue", icon: CircleDollarSign },
  { label: "Progress", href: "/progress", icon: LineChart },
  { label: "Feedback", href: "/feedback", icon: BarChart3 },
  { label: "Support", href: "/support", icon: MessageSquare },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

export const authRoutes = ["/login", "/forgot-password", "/verify-otp", "/reset-password"];
export const defaultProtectedRoute = "/dashboard";

export const planPriceFallback: Record<string, number> = {
  free_trial: 0,
  monthly_plan: 29.99,
  six_month_plan: 149.99,
  premium_plan: 150,
};
