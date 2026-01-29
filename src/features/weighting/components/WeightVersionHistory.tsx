import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { History, CheckCircle2, Archive, Eye } from "lucide-react";
import { format } from "date-fns";

interface WeightVersionHistoryProps {
  organizationId: string;
}

interface WeightVersion {
  id: string;
  version: number;
  is_active: boolean;
  set_at: string;
  approved_at: string | null;
  approval_notes: string | null;
  weights_json: Record<string, number>;
}

export function WeightVersionHistory({ organizationId }: WeightVersionHistoryProps) {
  const [versions, setVersions] = useState<WeightVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<WeightVersion | null>(null);

  useEffect(() => {
    async function loadVersions() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('weighting_final_weights')
          .select('*')
          .eq('org_id', organizationId)
          .order('version', { ascending: false });

        if (error) throw error;

        setVersions((data || []).map(v => ({
          id: v.id,
          version: v.version,
          is_active: v.is_active,
          set_at: v.set_at,
          approved_at: v.approved_at,
          approval_notes: v.approval_notes,
          weights_json: v.weights_json as Record<string, number>,
        })));
      } catch (error) {
        console.error('Error loading versions:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadVersions();
  }, [organizationId]);

  const activeVersion = versions.find(v => v.is_active);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Weight Version History
          </CardTitle>
          <CardDescription>
            Track all consequence weight versions for audit compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No weight versions found. Complete the weighting wizard to create your first version.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell className="font-medium">v{version.version}</TableCell>
                    <TableCell>
                      {version.is_active ? (
                        <Badge className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Archive className="h-3 w-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {version.approved_at
                        ? format(new Date(version.approved_at), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {version.approval_notes || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedVersion(version)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Selected Version Detail */}
      {selectedVersion && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Version {selectedVersion.version} Details
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedVersion(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(selectedVersion.weights_json || {})
                .sort(([, a], [, b]) => b - a)
                .map(([name, weight]) => (
                  <div key={name} className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold">{weight.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">
                      {name.replace(/_/g, ' ')}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
