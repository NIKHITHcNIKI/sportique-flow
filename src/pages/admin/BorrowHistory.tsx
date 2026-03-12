import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { mapDbError } from "@/lib/error-mapper";
import { format } from "date-fns";
import { CheckCircle, Download, Image } from "lucide-react";
import { downloadCSV } from "@/lib/csv-export";

const BorrowHistory = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [photoDialog, setPhotoDialog] = useState<{ open: boolean; url: string; title: string }>({ open: false, url: "", title: "" });

  const fetchRecords = async () => {
    const { data } = await supabase
      .from("borrow_records")
      .select("*, items(name)")
      .order("created_at", { ascending: false });

    const userIds = [...new Set((data ?? []).map((r: any) => r.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("user_id, full_name, student_id, department").in("user_id", userIds)
      : { data: [] };
    const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p]));
    setRecords((data ?? []).map((r: any) => ({ ...r, profile: profileMap[r.user_id] ?? null })));
  };

  useEffect(() => { fetchRecords(); }, []);

  const approveReturn = async (record: any) => {
    const { error } = await supabase
      .from("borrow_records")
      .update({ status: "returned", actual_return_date: new Date().toISOString() })
      .eq("id", record.id);
    if (error) { toast.error(mapDbError(error)); return; }
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

  const openPhoto = (url: string, title: string) => {
    setPhotoDialog({ open: true, url, title });
  };

  const downloadFile = () => {
    const data = records.map((r) => ({
      "Student Name": r.profile?.full_name ?? "Unknown",
      "Student ID": r.profile?.student_id ?? "—",
      Department: r.profile?.department ?? "—",
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
                  <TableHead>Student Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Borrow Date</TableHead>
                  <TableHead>Return Date</TableHead>
                  <TableHead>Photos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.profile?.full_name ?? "Unknown"}</TableCell>
                    <TableCell>{r.profile?.student_id ?? "—"}</TableCell>
                    <TableCell>{r.profile?.department ?? "—"}</TableCell>
                    <TableCell>{r.items?.name ?? "Unknown"}</TableCell>
                    <TableCell>{r.quantity}</TableCell>
                    <TableCell>{format(new Date(r.borrow_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{r.actual_return_date ? format(new Date(r.actual_return_date), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.borrow_photo_url && (
                          <Button size="sm" variant="ghost" className="gap-1 text-xs h-7 px-2" onClick={() => openPhoto(r.borrow_photo_url, "Borrow Photo")}>
                            <Image className="h-3.5 w-3.5" /> Borrow
                          </Button>
                        )}
                        {r.return_photo_url && (
                          <Button size="sm" variant="ghost" className="gap-1 text-xs h-7 px-2" onClick={() => openPhoto(r.return_photo_url, "Return Photo")}>
                            <Image className="h-3.5 w-3.5" /> Return
                          </Button>
                        )}
                        {!r.borrow_photo_url && !r.return_photo_url && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
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
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No records</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Photo Preview Dialog */}
      <Dialog open={photoDialog.open} onOpenChange={(open) => setPhotoDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{photoDialog.title}</DialogTitle>
          </DialogHeader>
          <img src={photoDialog.url} alt={photoDialog.title} className="w-full rounded-lg" />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default BorrowHistory;
