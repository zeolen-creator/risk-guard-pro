import { PROBABILITY_SCORES } from "@/constants/hazards";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ProbabilityTable() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary">
            <TableHead className="text-primary-foreground font-semibold">Score</TableHead>
            <TableHead className="text-primary-foreground font-semibold">Category</TableHead>
            <TableHead className="text-primary-foreground font-semibold">Description</TableHead>
            <TableHead className="text-primary-foreground font-semibold">Percent Chance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {PROBABILITY_SCORES.map((level, index) => (
            <TableRow key={level.score} className={index % 2 === 0 ? "bg-muted/30" : ""}>
              <TableCell className="font-semibold">{level.score}</TableCell>
              <TableCell className="font-medium">{level.category}</TableCell>
              <TableCell className="text-muted-foreground">{level.description}</TableCell>
              <TableCell className="text-muted-foreground">{level.percentChance}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
