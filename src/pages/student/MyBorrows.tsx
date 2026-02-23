import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { mapDbError } from "@/lib/error-mapper";
import { format } from "date-fns";
import { RotateCcw } from "lucide-react";

const MyBorrows = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);

  const fetchRecords = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("borrow_records")
      .select("*, items(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRecords(data ?? []);
  };

  useEffect(() => { fetchRecords(); }, [user]);

  const requestReturn = async (id: string) => {
    const { error } = await supabase
      .from("borrow_records")
      .update({ status: "return_requested" })
      .eq("id", id);
    if (error) toast.error(mapDbError(error));
    else { toast.success("Return requested! Waiting for admin approval."); fetchRecords(); }
  };

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
      <div className="space-y-6">
        <div>
          <h1 className="text-5xl text-secondary">MY BORROWS</h1>
          <p className="text-muted-foreground mt-1">Track your borrowed equipment</p>
        </div>

        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Borrow Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.items?.name ?? "Unknown"}</TableCell>
                    <TableCell>{r.quantity}</TableCell>
                    <TableCell>{format(new Date(r.borrow_date), "MMM d, yyyy")}</TableCell>
                    <TableCell><Badge className={statusColor(r.status)}>{r.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>
                      {r.status === "borrowed" && (
                        <Button size="sm" variant="outline" onClick={() => requestReturn(r.id)} className="gap-1">
                          <RotateCcw className="h-4 w-4" /> Request Return
                        </Button>
                      )}
                      {r.status === "return_requested" && (
                        <span className="text-sm text-muted-foreground">Pending approval</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {records.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No borrows yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MyBorrows;
