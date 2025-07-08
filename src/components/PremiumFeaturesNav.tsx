import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

export const PremiumFeaturesNav = () => {
  const { profile } = useAuth();
  
  const isPremiumPlus = profile?.plan_type === 'premium_plus' || profile?.plan_type === 'enterprise';
  
  if (!isPremiumPlus) return null;

  return (
    <Link to="/premium-features">
      <Button variant="outline" className="flex items-center gap-2">
        <Crown className="h-4 w-4" />
        Premium+ Features
      </Button>
    </Link>
  );
};