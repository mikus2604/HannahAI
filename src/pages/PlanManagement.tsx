import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const PlanManagement = () => {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Plan Management</h1>
        <p className="text-muted-foreground">Manage your subscription and billing</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Current Plan
            </CardTitle>
            <CardDescription>
              Your current subscription details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Plan details coming soon...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
            <CardDescription>
              Track your AI receptionist usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Usage tracking coming soon...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>
              Manage payments and invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Billing management coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlanManagement;