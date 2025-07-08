import { PhoneCall, Settings, Database, FileText, Shield, Crown, LogOut } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Call Details", url: "/", icon: PhoneCall },
  { title: "Assistant Settings", url: "/settings", icon: Settings },
  { title: "Security", url: "/security", icon: Shield },
  { title: "Integrations", url: "/integrations", icon: Database },
  { title: "Plan Management", url: "/plans", icon: FileText },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { signOut, profile } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50";

  const isPremium = profile?.plan_type === 'premium';

  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-4">
          <h2 className={`font-bold text-lg ${!open ? "hidden" : "block"}`}>
            mAIreceptionist
          </h2>
          {!open && (
            <div className="text-center text-sm font-bold">mAI</div>
          )}
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) => getNavCls({ isActive })}
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {open && !isPremium && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="p-3 mx-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs font-medium">Upgrade to Premium</span>
                </div>
                <NavLink to="/upgrade">
                  <Button size="sm" className="w-full bg-gradient-to-r from-yellow-500 to-orange-500">
                    <Crown className="h-3 w-3 mr-1" />
                    Upgrade Now
                  </Button>
                </NavLink>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                  {open && <span>Sign Out</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}