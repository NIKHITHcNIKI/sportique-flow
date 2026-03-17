import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { Package, Users, ArrowDownUp, Trash2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { format } from "date-fns";
import { generateCombinedPDFReport } from "@/lib/pdf-report";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ items: 0, students: 0, borrows: 0, scrapped: 0 });
  const [recentBorrows, setRecentBorrows] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

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

  const generateFullReport = async () => {
    setGenerating(true);
    try {
      const [itemsRes, borrowsRes, scrapsRes] = await Promise.all([
        supabase.from("items").select("*").order("name"),
        supabase.from("borrow_records").select("*, items(name)").order("created_at", { ascending: false }),
        supabase.from("scrap_items").select("*, items(name)").order("scrapped_at", { ascending: false }),
      ]);

      const userIds = [...new Set((borrowsRes.data ?? []).map((r: any) => r.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name, student_id, department").in("user_id", userIds)
        : { data: [] };
      const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p]));

      const sections = [
        {
          title: "Equipment Inventory Report",
          headers: ["Name", "Category", "Total Qty", "Available Qty", "Condition"],
          rows: (itemsRes.data ?? []).map((i: any) => [
            i.name, i.category, String(i.total_quantity), String(i.available_quantity), i.condition,
          ]),
        },
        {
          title: "Borrow History Report",
          headers: ["Student Name", "Student ID", "Department", "Item", "Qty", "Borrow Date", "Return Date", "Status", "Purpose"],
          rows: (borrowsRes.data ?? []).map((r: any) => {
            const p = profileMap[r.user_id];
            return [
              p?.full_name ?? "Unknown", p?.student_id ?? "—", p?.department ?? "—",
              r.items?.name ?? "Unknown", String(r.quantity),
              format(new Date(r.borrow_date), "MMM d, yyyy"),
              r.actual_return_date ? format(new Date(r.actual_return_date), "MMM d, yyyy") : "—",
              r.status.replace("_", " "), r.purpose ?? "",
            ];
          }),
        },
        {
          title: "Scrapped Items Report",
          headers: ["Item Name", "Quantity", "Reason", "Scrapped Date"],
          rows: (scrapsRes.data ?? []).map((s: any) => [
            s.items?.name ?? "Unknown", String(s.quantity), s.reason ?? "—",
            format(new Date(s.scrapped_at), "MMM d, yyyy"),
          ]),
        },
      ];

      await generateCombinedPDFReport(sections, "full_admin_report.pdf");
      toast.success("Full report downloaded!");
    } catch (err) {
      toast.error("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl text-secondary">ADMIN DASHBOARD</h1>
            <p className="text-muted-foreground mt-1">Overview of sports equipment management</p>
          </div>
          <Button onClick={generateFullReport} disabled={generating} variant="outline" className="gap-2 font-semibold">
            <FileText className="h-4 w-4" /> {generating ? "Generating..." : "Full PDF Report"}
          </Button>
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
