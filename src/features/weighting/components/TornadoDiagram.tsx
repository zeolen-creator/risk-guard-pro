import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

interface TornadoDiagramProps {
  data: Array<{
    consequence: string;
    baseScore: number;
    minScore: number;
    maxScore: number;
    impact: number;
  }>;
}

export function TornadoDiagram({ data }: TornadoDiagramProps) {
  // Sort by impact (largest swing first)
  const sortedData = [...data].sort((a, b) => b.impact - a.impact);

  // Transform for tornado chart
  const chartData = sortedData.map(item => ({
    name: item.consequence.replace(/_/g, ' '),
    low: item.minScore - item.baseScore,
    high: item.maxScore - item.baseScore,
    base: item.baseScore,
    impact: item.impact,
  }));

  const baseScore = data[0]?.baseScore || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tornado Diagram</CardTitle>
        <CardDescription>
          Impact of ±20% weight changes on overall risk score
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
            >
              <XAxis
                type="number"
                domain={['dataMin - 5', 'dataMax + 5']}
                tickFormatter={(value) => `${value > 0 ? '+' : ''}${value.toFixed(1)}`}
              />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value > 0 ? '+' : ''}${value.toFixed(2)}`,
                  name === 'low' ? 'Weight -20%' : 'Weight +20%',
                ]}
                labelFormatter={(label) => label}
              />
              <ReferenceLine x={0} stroke="hsl(var(--foreground))" strokeWidth={2} />
              <Bar dataKey="low" stackId="stack" name="Weight -20%">
                {chartData.map((entry, index) => (
                  <Cell
                    key={`low-${index}`}
                    fill={entry.low < 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                    fillOpacity={0.7}
                  />
                ))}
              </Bar>
              <Bar dataKey="high" stackId="stack" name="Weight +20%">
                {chartData.map((entry, index) => (
                  <Cell
                    key={`high-${index}`}
                    fill={entry.high > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                    fillOpacity={0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary opacity-70" />
            <span>Score Decrease</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive opacity-70" />
            <span>Score Increase</span>
          </div>
        </div>

        {/* Impact Summary */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="font-medium mb-3">Most Sensitive Consequences</h4>
          <div className="grid grid-cols-3 gap-2">
            {sortedData.slice(0, 3).map((item, idx) => (
              <div key={idx} className="text-center p-2 bg-muted/50 rounded">
                <div className="text-lg font-bold">±{item.impact.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">
                  {item.consequence.replace(/_/g, ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
