import { LayoutDashboard, MessageCircle } from "lucide-react";

export const PLATFORM_CONFIG = {
  canvas: {
    icon: LayoutDashboard,
    iconBg: "rgba(217,60,50,.08)",
    iconColor: "#d93c32",
  },
  ed: {
    icon: MessageCircle,
    iconBg: "rgba(106,155,204,.11)",
    iconColor: "#6a9bcc",
  },
} as const;
