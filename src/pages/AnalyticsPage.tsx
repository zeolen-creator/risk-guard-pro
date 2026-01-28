import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ArrowLeft, LogOut, User, Loader2 } from "lucide-react";
import { RiskPredictionPanel } from "@/components/features/predictions/RiskPredictionPanel";
import { RiskAlertsWidget } from "@/components/features/alerts/RiskAlertsWidget";
import { BenchmarkDashboard } from "@/components/features/benchmarking/BenchmarkDashboard";
import { IncidentLogPanel } from "@/components/features/incidents/IncidentLogPanel";
import { ControlsPanel } from "@/components/features/controls/ControlsPanel";
import { ExecutiveReportsPanel } from "@/components/features/reports/ExecutiveReportsPanel";
import { MonteCarloPanel } from "@/components/features/simulations/MonteCarloPanel";

export default function AnalyticsPage() {
  const { signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: organization, isLoading: orgLoading } = useOrganization();

  if (profileLoading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">HIRA Pro</span>
          </Link>

          <div className="flex items-center gap-2">
            <RiskAlertsWidget />
            <Button variant="ghost" size="icon" asChild>
              <Link to="/profile">
                <User className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Analytics & Insights</h1>
          <p className="text-muted-foreground">
            Advanced risk analytics for {organization?.name}
          </p>
        </div>

        <Tabs defaultValue="predictions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto">
            <TabsTrigger value="predictions" className="py-2">Predictions</TabsTrigger>
            <TabsTrigger value="simulations" className="py-2">Simulations</TabsTrigger>
            <TabsTrigger value="benchmarking" className="py-2">Benchmarking</TabsTrigger>
            <TabsTrigger value="incidents" className="py-2">Incidents</TabsTrigger>
            <TabsTrigger value="controls" className="py-2">Controls</TabsTrigger>
            <TabsTrigger value="reports" className="py-2">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="predictions">
            <RiskPredictionPanel />
          </TabsContent>

          <TabsContent value="simulations">
            <MonteCarloPanel />
          </TabsContent>

          <TabsContent value="benchmarking">
            <BenchmarkDashboard />
          </TabsContent>

          <TabsContent value="incidents">
            <IncidentLogPanel />
          </TabsContent>

          <TabsContent value="controls">
            <ControlsPanel />
          </TabsContent>

          <TabsContent value="reports">
            <ExecutiveReportsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
