import { Users, DollarSign, Settings, Tag, Clock, BarChart3, TrendingUp, FileText } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  pendingRefundCount?: number;
}

export function AdminSidebar({ activeSection, onSectionChange, pendingRefundCount = 0 }: AdminSidebarProps) {
  const menuItems = [
    {
      title: "Usuarios",
      items: [
        {
          title: "Gestión de Usuarios",
          icon: Users,
          section: "users",
        },
        {
          title: "Análisis de Usuarios",
          icon: BarChart3,
          section: "user-analysis",
        },
      ],
    },
    {
      title: "Finanzas",
      items: [
        {
          title: "Dashboard Económico",
          icon: TrendingUp,
          section: "financial-dashboard",
        },
        {
          title: "Facturas",
          icon: FileText,
          section: "invoices",
        },
        {
          title: "Solicitudes de Refund",
          icon: DollarSign,
          section: "refunds",
          badge: pendingRefundCount > 0 ? pendingRefundCount : undefined,
        },
      ],
    },
    {
      title: "Configuración",
      items: [
        {
          title: "Límites de Suscripción",
          icon: Settings,
          section: "limits",
        },
        {
          title: "Códigos Promocionales",
          icon: Tag,
          section: "promo-codes",
        },
        {
          title: "Códigos de Creador",
          icon: Users,
          section: "creator-codes",
        },
      ],
    },
    {
      title: "Sistema",
      items: [
        {
          title: "Grace Period",
          icon: Clock,
          section: "grace-period",
        },
        {
          title: "Métricas",
          icon: BarChart3,
          section: "metrics",
        },
      ],
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-4">
          <h2 className="text-lg font-semibold">Admin Dashboard</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {menuItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.section}>
                    <SidebarMenuButton
                      isActive={activeSection === item.section}
                      onClick={() => onSectionChange(item.section)}
                      tooltip={item.title}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <SidebarMenuBadge className="ml-auto">
                          {item.badge}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

