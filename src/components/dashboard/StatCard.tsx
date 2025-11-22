import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  footer?: {
    label: string;
    description: string;
  };
}

export default function StatCard({
  title,
  value,
  description,
  trend,
  footer
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <div className="flex items-center justify-between">
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {value}
          </CardTitle>
          {trend && (
            <Badge variant="outline" className="ml-auto">
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {trend.value}
            </Badge>
          )}
        </div>
      </CardHeader>
      {footer && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm pt-0">
          <div className="flex gap-2 font-medium leading-none">
            {footer.label}
            {trend?.isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
          </div>
          <div className="text-muted-foreground leading-none">
            {footer.description}
          </div>
        </CardFooter>
      )}
    </Card>
  );
} 