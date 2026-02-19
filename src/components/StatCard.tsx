import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
}

const StatCard = ({ title, value, icon: Icon, color = "bg-primary" }: StatCardProps) => (
  <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{value}</p>
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="h-6 w-6 text-primary-foreground" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default StatCard;
