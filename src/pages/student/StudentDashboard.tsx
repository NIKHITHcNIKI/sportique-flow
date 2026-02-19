import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { ShoppingCart, RotateCcw, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const StudentDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ borrowed: 0, returned: 0, available: 0 });
  const [myBorrows, setMyBorrows] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [borrowedRes, returnedRes, itemsRes, borrowsRes] = await Promise.all([
        supabase.from("borrow_records").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "borrowed"),
        supabase.from("borrow_records").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "returned"),
        supabase.from("items").select("available_quantity"),
        supabase.from("borrow_records").select("*, items(name)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);
      setStats({
        borrowed: borrowedRes.count ?? 0,
        returned: returnedRes.count ?? 0,
        available: itemsRes.data?.reduce((s, i) => s + i.available_quantity, 0) ?? 0,
      });
      setMyBorrows(borrowsRes.data ?? []);
    };
    fetchData();
  }, [user]);

  const statusColor = (s: string) => {
    switch (s) {
      case "borrowed": return "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]";
      case "returned": return "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]";
      case "return_requested": return "bg-primary/20 text-primary";
      default: return "";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-5xl text-secondary">MY DASHBOARD</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's your equipment overview.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Currently Borrowed" value={stats.borrowed} icon={ShoppingCart} />
          <StatCard title="Returned" value={stats.returned} icon={RotateCcw} color="bg-[hsl(var(--success))]" />
          <StatCard title="Available Equipment" value={stats.available} icon={Package} color="bg-secondary" />
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl text-secondary">RECENT BORROWS</CardTitle>
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
                {myBorrows.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.items?.name ?? "Unknown"}</TableCell>
                    <TableCell>{b.quantity}</TableCell>
                    <TableCell><Badge className={statusColor(b.status)}>{b.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>{format(new Date(b.borrow_date), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
                {myBorrows.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No borrows yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
