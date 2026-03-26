import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/sonner";
import { mapDbError } from "@/lib/error-mapper";
import { format, startOfDay, startOfMonth, startOfYear, endOfDay, endOfMonth, endOfYear } from "date-fns";
import { CheckCircle, Download, Image, FileText, Trash2 } from "lucide-react";
import { downloadCSV } from "@/lib/csv-export";
import { generatePDFReport } from "@/lib/pdf-report";
import { Calendar } from "@/components/ui/calendar";

const BorrowHistory = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [photoDialog, setPhotoDialog] = useState<{ open: boolean; url: string; title: string }>({ open: false, url: "", title: "" });
  const [reportType, setReportType] = useState<string>("all");
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [reportOpen, setReportOpen] = useState(false);

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

  const deleteRecord = async (record: any) => {
    if (!confirm("Are you sure you want to delete this borrow record?")) return;
    const { error } = await supabase.from("borrow_records").delete().eq("id", record.id);
    if (error) { toast.error(mapDbError(error)); return; }
    toast.success("Record deleted!");
    fetchRecords();
  };

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

  const generateReport = () => {
    let filtered = records;
    let titleSuffix = "";

    if (reportType === "daily") {
      const dayStart = startOfDay(reportDate);
      const dayEnd = endOfDay(reportDate);
      filtered = records.filter(r => {
        const d = new Date(r.borrow_date);
        return d >= dayStart && d <= dayEnd;
      });
      titleSuffix = ` — ${format(reportDate, "dd MMM yyyy")}`;
    } else if (reportType === "monthly") {
      const mStart = startOfMonth(reportDate);
      const mEnd = endOfMonth(reportDate);
      filtered = records.filter(r => {
        const d = new Date(r.borrow_date);
        return d >= mStart && d <= mEnd;
      });
      titleSuffix = ` — ${format(reportDate, "MMMM yyyy")}`;
    } else if (reportType === "yearly") {
      const yStart = startOfYear(reportDate);
      const yEnd = endOfYear(reportDate);
      filtered = records.filter(r => {
        const d = new Date(r.borrow_date);
        return d >= yStart && d <= yEnd;
      });
      titleSuffix = ` — ${format(reportDate, "yyyy")}`;
    }

    if (filtered.length === 0) {
      toast.error("No records found for the selected period");
      return;
    }

    const headers = ["Student Name", "Student ID", "Department", "Item", "Qty", "Borrow Date", "Return Date", "Status", "Purpose"];
    const rows = filtered.map(r => [
      r.profile?.full_name ?? "Unknown",
      r.profile?.student_id ?? "—",
      r.profile?.department ?? "—",
      r.items?.name ?? "Unknown",
      String(r.quantity),
      format(new Date(r.borrow_date), "MMM d, yyyy"),
      r.actual_return_date ? format(new Date(r.actual_return_date), "MMM d, yyyy") : "—",
      r.status.replace("_", " "),
      r.purpose ?? "",
    ]);

    generatePDFReport({
      title: `Borrow History Report${titleSuffix}`,
      headers,
      rows,
      filename: `borrow_report_${reportType}.pdf`,
    });
    toast.success("PDF report downloaded!");
    setReportOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl text-secondary">BORROW HISTORY</h1>
            <p className="text-muted-foreground mt-1">All borrowing records and return approvals</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={downloadFile} variant="outline" className="gap-2 font-semibold">
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
              <Button onClick={() => setReportOpen(true)} variant="outline" className="gap-2 font-semibold">
                <FileText className="h-4 w-4" /> PDF Report
              </Button>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-2xl" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>GENERATE REPORT</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Report Period</label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Records</SelectItem>
                        <SelectItem value="daily">Daily Report</SelectItem>
                        <SelectItem value="monthly">Monthly Report</SelectItem>
                        <SelectItem value="yearly">Yearly Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {reportType !== "all" && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        {reportType === "daily" ? "Select Date" : reportType === "monthly" ? "Select Month" : "Select Year"}
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            {reportType === "daily" && format(reportDate, "dd MMM yyyy")}
                            {reportType === "monthly" && format(reportDate, "MMMM yyyy")}
                            {reportType === "yearly" && format(reportDate, "yyyy")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={reportDate}
                            onSelect={(d) => d && setReportDate(d)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  <Button onClick={generateReport} className="w-full font-semibold gap-2">
                    <FileText className="h-4 w-4" /> Generate PDF
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
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
                      <div className="flex gap-1">
                        {r.status === "return_requested" && (
                          <Button size="sm" onClick={() => approveReturn(r)} className="gap-1">
                            <CheckCircle className="h-4 w-4" /> Approve
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteRecord(r)} className="gap-1 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
