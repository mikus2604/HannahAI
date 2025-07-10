import { PhoneCall, Settings, Database, FileText, Shield, Crown, LogOut, Phone, Wrench } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const systemItems = [];

const premiumItems = [
  { title: "Premium+ Features", url: "/premium-features", icon: Crown },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { signOut, profile, hasRole } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50";

  const isPremiumPlus = profile?.plan_type === 'premium_plus' || profile?.plan_type === 'enterprise';

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

        {isPremiumPlus && (
          <SidebarGroup>
            <SidebarGroupLabel>Premium+ Features</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {premiumItems.map((item) => (
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
        )}

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
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

        {open && !isPremiumPlus && profile?.plan_type === 'free' && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="p-3 mx-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs font-medium">Upgrade to Premium</span>
                </div>
                <NavLink to="/plans">
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
      
      {/* Super User Admin Section */}
      {hasRole('super_user') && (
        <div className="border-t">
          <SidebarGroup>
            <SidebarGroupLabel className="text-red-600 font-semibold">
              Super User
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin"
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 p-2 rounded-lg transition-colors",
                          isActive
                            ? "bg-red-100 text-red-900 font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )
                      }
                    >
                      <Shield className="h-4 w-4" />
                      <span>Admin Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      )}
      
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