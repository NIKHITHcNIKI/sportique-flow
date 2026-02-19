import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { Package, Users, ArrowDownUp, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ items: 0, students: 0, borrows: 0, scrapped: 0 });
  const [recentBorrows, setRecentBorrows] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [itemsRes, studentsRes, borrowsRes, scrappedRes] = await Promise.all([
        supabase.from("items").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("borrow_records").select("id", { count: "exact", head: true }).eq("status", "borrowed"),
        supabase.from("scrap_items").select("quantity"),
      ]);
      setStats({
        items: itemsRes.count ?? 0,
        students: studentsRes.count ?? 0,
        borrows: borrowsRes.count ?? 0,
        scrapped: scrappedRes.data?.reduce((sum, s) => sum + s.quantity, 0) ?? 0,
      });
    };

    const fetchRecent = async () => {
      const { data } = await supabase
        .from("borrow_records")
        .select("*, items(name)")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentBorrows(data ?? []);
    };

    fetchStats();
    fetchRecent();
  }, []);

  const statusColor = (s: string) => {
    switch (s) {
      case "borrowed": return "bg-warning text-warning-foreground";
      case "returned": return "bg-success text-success-foreground";
      case "return_requested": return "bg-primary/20 text-primary";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-5xl text-secondary">ADMIN DASHBOARD</h1>
          <p className="text-muted-foreground mt-1">Overview of sports equipment management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Total Items" value={stats.items} icon={Package} />
          <StatCard title="Students" value={stats.students} icon={Users} color="bg-secondary" />
          <StatCard title="Active Borrows" value={stats.borrows} icon={ArrowDownUp} color="bg-[hsl(var(--warning))]" />
          <StatCard title="Scrapped Items" value={stats.scrapped} icon={Trash2} color="bg-destructive" />
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl text-secondary">RECENT ACTIVITY</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBorrows.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.items?.name ?? "Unknown"}</TableCell>
                    <TableCell>{b.quantity}</TableCell>
                    <TableCell>
                      <Badge className={statusColor(b.status)}>{b.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>{format(new Date(b.borrow_date), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
                {recentBorrows.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No recent activity</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
