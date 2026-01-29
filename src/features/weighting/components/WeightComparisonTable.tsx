import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface WeightComparisonTableProps {
  ahpWeights: Record<string, number>;
  recommendedWeights: Record<string, number>;
  changes: Record<string, string>;
}

export function WeightComparisonTable({
  ahpWeights,
  recommendedWeights,
  changes,
}: WeightComparisonTableProps) {
  const consequences = Object.keys(recommendedWeights).sort((a, b) => 
    recommendedWeights[b] - recommendedWeights[a]
  );

  const getChangeIcon = (change: string) => {
    if (!change) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (change.startsWith('+')) {
      return <ArrowUp className="h-4 w-4 text-green-500" />;
    }
    if (change.startsWith('-')) {
      return <ArrowDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getChangeColor = (change: string) => {
    if (!change || change === '0' || change === '+0' || change === '-0') {
      return 'text-muted-foreground';
    }
    if (change.startsWith('+')) return 'text-green-600';
    if (change.startsWith('-')) return 'text-red-600';
    return 'text-muted-foreground';
  };

  const calculateDifference = (consequence: string) => {
    const ahp = ahpWeights[consequence] || 0;
    const recommended = recommendedWeights[consequence] || 0;
    const diff = recommended - ahp;
    if (Math.abs(diff) < 0.1) return '0';
    return diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weight Comparison</CardTitle>
        <CardDescription>
          How AI-recommended weights differ from your AHP-derived weights
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Consequence</TableHead>
              <TableHead className="text-right">AHP Weight</TableHead>
              <TableHead className="text-right">Recommended</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {consequences.map((consequence) => {
              const ahp = ahpWeights[consequence] || 0;
              const recommended = recommendedWeights[consequence] || 0;
              const change = changes[consequence] || calculateDifference(consequence);
              const changeValue = parseFloat(change.replace('+', ''));

              return (
                <TableRow key={consequence}>
                  <TableCell className="font-medium">
                    {consequence.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {ahp.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {recommended.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={`flex items-center justify-end gap-1 ${getChangeColor(change)}`}>
                      {getChangeIcon(change)}
                      <span className="tabular-nums">{change}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {Math.abs(changeValue) >= 3 ? (
                      <Badge variant="outline" className="text-xs">
                        {changeValue > 0 ? 'Regulatory emphasis' : 'Balanced adjustment'}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Minor adjustment</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {consequences.filter(c => {
                const change = changes[c] || calculateDifference(c);
                return change.startsWith('+') && parseFloat(change) > 0;
              }).length}
            </div>
            <div className="text-xs text-muted-foreground">Increased</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-muted-foreground">
              {consequences.filter(c => {
                const change = changes[c] || calculateDifference(c);
                return Math.abs(parseFloat(change.replace('+', ''))) < 0.5;
              }).length}
            </div>
            <div className="text-xs text-muted-foreground">Unchanged</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {consequences.filter(c => {
                const change = changes[c] || calculateDifference(c);
                return change.startsWith('-') && parseFloat(change) < 0;
              }).length}
            </div>
            <div className="text-xs text-muted-foreground">Decreased</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
