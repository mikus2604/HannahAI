import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";

interface BackfillCollectedDataProps {
  callId: string;
  onDataUpdated?: () => void;
}

export const BackfillCollectedData = ({ callId, onDataUpdated }: BackfillCollectedDataProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleBackfill = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('backfill-collected-data', {
        body: { callId }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Collected data has been extracted and updated",
      });

      if (onDataUpdated) {
        onDataUpdated();
      }

    } catch (error) {
      console.error('Error backfilling data:', error);
      toast({
        title: "Error",
        description: "Failed to extract collected data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={handleBackfill}
      disabled={loading}
    >
      <RefreshCw className={`h-3 w-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
      Extract Collected Data
    </Button>
  );
};

export default BackfillCollectedData;