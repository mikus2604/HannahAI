import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TestTube, CheckCircle, XCircle, RefreshCw } from "lucide-react";

const SubscriptionTester = () => {
  const { user, checkSubscriptionStatus } = useAuth();
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Array<{ name: string; status: 'success' | 'error' | 'pending'; message: string }>>([]);

  const runTests = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to run subscription tests",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    setTestResults([]);

    const tests = [
      {
        name: "Check Subscription Function",
        test: async () => {
          const { data, error } = await supabase.functions.invoke('check-subscription');
          if (error) throw error;
          return `Subscription status: ${data.subscribed ? 'Active' : 'Inactive'}, Tier: ${data.subscription_tier || 'None'}`;
        }
      },
      {
        name: "Create Checkout Session",
        test: async () => {
          const { data, error } = await supabase.functions.invoke('create-checkout', {
            body: { priceAmount: 2495, planName: 'Premium' }
          });
          if (error) throw error;
          return `Checkout URL generated successfully: ${data.url ? 'Yes' : 'No'}`;
        }
      },
      {
        name: "Customer Portal Access",
        test: async () => {
          const { data, error } = await supabase.functions.invoke('customer-portal');
          if (error && !error.message.includes('No Stripe customer found')) {
            throw error;
          }
          return error?.message || `Portal URL generated: ${data?.url ? 'Yes' : 'No'}`;
        }
      },
      {
        name: "AuthContext Integration",
        test: async () => {
          await checkSubscriptionStatus();
          return "AuthContext subscription check completed successfully";
        }
      }
    ];

    for (const testCase of tests) {
      try {
        setTestResults(prev => [...prev, { name: testCase.name, status: 'pending', message: 'Running...' }]);
        
        const result = await testCase.test();
        
        setTestResults(prev => prev.map(test => 
          test.name === testCase.name 
            ? { ...test, status: 'success', message: result }
            : test
        ));
      } catch (error) {
        setTestResults(prev => prev.map(test => 
          test.name === testCase.name 
            ? { ...test, status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }
            : test
        ));
      }
    }

    setTesting(false);
    toast({
      title: "Tests Completed",
      description: "All subscription integration tests have been completed",
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Stripe Integration Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Test all Stripe subscription features and edge functions
          </p>
          <Button 
            onClick={runTests} 
            disabled={testing || !user}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Running Tests...' : 'Run Tests'}
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="mt-1">
                  {result.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {result.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                  {result.status === 'pending' && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.name}</span>
                    <Badge variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
                      {result.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!user && (
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Please sign in to run subscription tests</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionTester;