import { PROBABILITY_SCORES } from "@/constants/hazards";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ProbabilityTableProps {
  compact?: boolean;
}

export function ProbabilityTable({ compact = false }: ProbabilityTableProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary">
            <TableHead className="text-primary-foreground font-semibold">Score</TableHead>
            <TableHead className="text-primary-foreground font-semibold">Category</TableHead>
            <TableHead className={cn("text-primary-foreground font-semibold", compact && "hidden md:table-cell")}>Description</TableHead>
            <TableHead className={cn("text-primary-foreground font-semibold", compact && "hidden lg:table-cell")}>Percent Chance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {PROBABILITY_SCORES.map((level, index) => (
            <TableRow key={level.score} className={index % 2 === 0 ? "bg-muted/30" : ""}>
              <TableCell className="font-semibold">{level.score}</TableCell>
              <TableCell className="font-medium">{level.category}</TableCell>
              <TableCell className={cn("text-muted-foreground", compact && "hidden md:table-cell")}>{level.description}</TableCell>
              <TableCell className={cn("text-muted-foreground", compact && "hidden lg:table-cell")}>{level.percentChance}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}