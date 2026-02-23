import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { mapDbError } from "@/lib/error-mapper";
import { format } from "date-fns";
import { CheckCircle, Download } from "lucide-react";
import { downloadCSV } from "@/lib/csv-export";

const BorrowHistory = () => {
  const [records, setRecords] = useState<any[]>([]);

  const fetchRecords = async () => {
    const { data } = await supabase
      .from("borrow_records")
      .select("*, items(name)")
      .order("created_at", { ascending: false });
    setRecords(data ?? []);
  };

  useEffect(() => { fetchRecords(); }, []);

  const approveReturn = async (record: any) => {
    const { error } = await supabase
      .from("borrow_records")
      .update({ status: "returned", actual_return_date: new Date().toISOString() })
      .eq("id", record.id);
    if (error) { toast.error(mapDbError(error)); return; }

    // Atomically restore available quantity
    await supabase.rpc("return_item", { _item_id: record.item_id, _qty: record.quantity });
    toast.success("Return approved!");
    fetchRecords();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "borrowed": return "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]";
      case "returned": return "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]";
      case "return_requested": return "bg-primary/20 text-primary";
      default: return "";
    }
  };

  const downloadFile = () => {
    const data = records.map((r) => ({
      Item: r.items?.name ?? "Unknown",
      Quantity: r.quantity,
      "Borrow Date": format(new Date(r.borrow_date), "MMM d, yyyy"),
      "Return Date": r.actual_return_date ? format(new Date(r.actual_return_date), "MMM d, yyyy") : "",
      Status: r.status.replace("_", " "),
      Purpose: r.purpose ?? "",
    }));
    downloadCSV(data, "borrow_history.csv");
    toast.success("Downloaded borrow history!");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl text-secondary">BORROW HISTORY</h1>
            <p className="text-muted-foreground mt-1">All borrowing records and return approvals</p>
          </div>
          <Button onClick={downloadFile} variant="outline" className="gap-2 font-semibold">
            <Download className="h-4 w-4" /> Download CSV
          </Button>
        </div>

        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Borrow Date</TableHead>
                  <TableHead>Return Date</TableHead>
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
                    <TableCell>{r.actual_return_date ? format(new Date(r.actual_return_date), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell><Badge className={statusColor(r.status)}>{r.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>
                      {r.status === "return_requested" && (
                        <Button size="sm" onClick={() => approveReturn(r)} className="gap-1">
                          <CheckCircle className="h-4 w-4" /> Approve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {records.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No records</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BorrowHistory;
