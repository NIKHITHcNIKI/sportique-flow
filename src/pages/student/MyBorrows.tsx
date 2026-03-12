import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { mapDbError } from "@/lib/error-mapper";
import { format } from "date-fns";
import { RotateCcw } from "lucide-react";
import CameraCapture from "@/components/CameraCapture";

const MyBorrows = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [returnPhotoBlob, setReturnPhotoBlob] = useState<Blob | null>(null);
  const [returnPhotoPreview, setReturnPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const openReturnDialog = (record: any) => {
    setSelectedRecord(record);
    setReturnPhotoBlob(null);
    setReturnPhotoPreview(null);
    setReturnDialogOpen(true);
  };

  const handleReturnPhotoCapture = (blob: Blob) => {
    setReturnPhotoBlob(blob);
    setReturnPhotoPreview(URL.createObjectURL(blob));
  };

  const clearReturnPhoto = () => {
    setReturnPhotoBlob(null);
    if (returnPhotoPreview) URL.revokeObjectURL(returnPhotoPreview);
    setReturnPhotoPreview(null);
  };

  const submitReturn = async () => {
    if (!selectedRecord || !returnPhotoBlob || !user) return;
    setSubmitting(true);

    // Upload return photo
    const fileName = `return_${user.id}_${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("borrow-photos")
      .upload(fileName, returnPhotoBlob, { contentType: "image/jpeg" });
    if (uploadError) {
      toast.error("Failed to upload photo. Please try again.");
      setSubmitting(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("borrow-photos").getPublicUrl(fileName);
    const photoUrl = urlData.publicUrl;

    const { error } = await supabase
      .from("borrow_records")
      .update({ status: "return_requested", return_photo_url: photoUrl })
      .eq("id", selectedRecord.id);
    if (error) {
      toast.error(mapDbError(error));
    } else {
      toast.success("Return requested! Waiting for admin approval.");
      setReturnDialogOpen(false);
      clearReturnPhoto();
      setSelectedRecord(null);
      fetchRecords();
    }
    setSubmitting(false);
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
                        <Button size="sm" variant="outline" onClick={() => openReturnDialog(r)} className="gap-1">
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

      {/* Return Photo Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Return: {selectedRecord?.items?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Take a photo of the item before returning. This is required for verification.
            </p>
            <CameraCapture
              onCapture={handleReturnPhotoCapture}
              capturedPreview={returnPhotoPreview}
              onClear={clearReturnPhoto}
              label="📸 Take photo of item (required)"
            />
            <Button
              onClick={submitReturn}
              disabled={submitting || !returnPhotoBlob}
              className="w-full font-semibold gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {submitting ? "Submitting..." : "Submit Return Request"}
            </Button>
            {!returnPhotoBlob && (
              <p className="text-xs text-destructive text-center">⚠️ Photo is required to request return</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MyBorrows;
