import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { mapDbError } from "@/lib/error-mapper";
import { format } from "date-fns";
import { Trash2, Plus, Download, Camera, Upload, Image, X, FileText } from "lucide-react";
import { downloadCSV } from "@/lib/csv-export";
import { generatePDFReport } from "@/lib/pdf-report";
import CameraCapture from "@/components/CameraCapture";

const ScrapItems = () => {
  const { user } = useAuth();
  const [scraps, setScraps] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ item_id: "", quantity: 1, reason: "" });
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchScraps = async () => {
    const { data } = await supabase.from("scrap_items").select("*, items(name)").order("scrapped_at", { ascending: false });
    setScraps(data ?? []);
  };

  const fetchItems = async () => {
    const { data } = await supabase.from("items").select("id, name, available_quantity").gt("available_quantity", 0);
    setItems(data ?? []);
  };

  useEffect(() => { fetchScraps(); fetchItems(); }, []);

  const uploadPhoto = async (blob: Blob): Promise<string | null> => {
    const fileName = `scrap_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const { error } = await supabase.storage.from("borrow-photos").upload(fileName, blob, { contentType: "image/jpeg" });
    if (error) return null;
    const { data: urlData } = supabase.storage.from("borrow-photos").getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    setPhotoBlob(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setPhotoBlob(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleScrap = async () => {
    if (!form.item_id) { toast.error("Select an item"); return; }
    if (form.quantity < 1 || form.quantity > 9999) { toast.error("Quantity must be between 1 and 9999"); return; }
    if (form.reason && form.reason.length > 500) { toast.error("Reason must be under 500 characters"); return; }

    let photoUrl: string | null = null;
    if (photoBlob) {
      photoUrl = await uploadPhoto(photoBlob);
      if (!photoUrl) { toast.error("Failed to upload photo"); return; }
    }

    const { error } = await supabase.from("scrap_items").insert({
      item_id: form.item_id,
      quantity: form.quantity,
      reason: form.reason ? form.reason.trim().slice(0, 500) : null,
      scrapped_by: user?.id,
      photo_url: photoUrl,
    });
    if (error) { toast.error(mapDbError(error)); return; }

    // Atomically reduce available & total quantity
    const { data: scrapped } = await supabase.rpc("scrap_item", { _item_id: form.item_id, _qty: form.quantity });
    if (!scrapped) { toast.error("Not enough available quantity to scrap"); return; }

    toast.success("Item scrapped!");
    setOpen(false);
    setForm({ item_id: "", quantity: 1, reason: "" });
    clearPhoto();
    fetchScraps();
    fetchItems();
  };

  const downloadFile = () => {
    const data = scraps.map((s) => ({
      Item: s.items?.name ?? "Unknown",
      Quantity: s.quantity,
      Reason: s.reason ?? "",
      Date: format(new Date(s.scrapped_at), "MMM d, yyyy"),
    }));
    downloadCSV(data, "scrap_items.csv");
    toast.success("Downloaded scrap items!");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl text-secondary">SCRAP ITEMS</h1>
            <p className="text-muted-foreground mt-1">Track scrapped and damaged equipment</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={downloadFile} variant="outline" className="gap-2 font-semibold">
              <Download className="h-4 w-4" /> Download CSV
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 font-semibold bg-destructive hover:bg-destructive/90">
                  <Plus className="h-4 w-4" /> Scrap Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-2xl" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>SCRAP AN ITEM</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <Select value={form.item_id} onValueChange={(v) => setForm({ ...form, item_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select item..." /></SelectTrigger>
                    <SelectContent>
                      {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.available_quantity} avail)</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" min={1} max={9999} placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.max(1, Math.min(9999, +e.target.value)) })} />
                  <Input placeholder="Reason (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} maxLength={500} />
                  
                  {/* Photo section */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Photo (optional)</p>
                    {photoPreview ? (
                      <div className="relative rounded-lg overflow-hidden border">
                        <img src={photoPreview} alt="Scrap photo" className="w-full h-40 object-cover" />
                        <Button type="button" size="sm" variant="destructive" className="absolute top-2 right-2 gap-1" onClick={clearPhoto}>
                          <X className="h-3 w-3" /> Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <CameraCapture
                          onCapture={(blob) => { setPhotoBlob(blob); setPhotoPreview(URL.createObjectURL(blob)); }}
                          capturedPreview={null}
                          label="Take Photo"
                        />
                        <div className="flex-1">
                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                          <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="h-4 w-4" /> Upload Photo
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button onClick={handleScrap} className="w-full bg-destructive hover:bg-destructive/90 font-semibold">Confirm Scrap</Button>
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
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scraps.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-destructive" />
                      {s.items?.name ?? "Unknown"}
                    </TableCell>
                    <TableCell>{s.quantity}</TableCell>
                    <TableCell>{s.reason ?? "—"}</TableCell>
                    <TableCell>
                      {s.photo_url ? (
                        <a href={s.photo_url} target="_blank" rel="noopener noreferrer">
                          <img src={s.photo_url} alt="Scrap" className="h-10 w-10 rounded object-cover border" />
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{format(new Date(s.scrapped_at), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
                {scraps.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No scrapped items</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ScrapItems;
