import { useEffect, useState } from "react";
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
import { format } from "date-fns";
import { Trash2, Plus } from "lucide-react";

const ScrapItems = () => {
  const { user } = useAuth();
  const [scraps, setScraps] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ item_id: "", quantity: 1, reason: "" });

  const fetchScraps = async () => {
    const { data } = await supabase.from("scrap_items").select("*, items(name)").order("scrapped_at", { ascending: false });
    setScraps(data ?? []);
  };

  const fetchItems = async () => {
    const { data } = await supabase.from("items").select("id, name, available_quantity").gt("available_quantity", 0);
    setItems(data ?? []);
  };

  useEffect(() => { fetchScraps(); fetchItems(); }, []);

  const handleScrap = async () => {
    if (!form.item_id) { toast.error("Select an item"); return; }
    const { error } = await supabase.from("scrap_items").insert({
      item_id: form.item_id,
      quantity: form.quantity,
      reason: form.reason || null,
      scrapped_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }

    // Reduce available & total quantity
    const item = items.find(i => i.id === form.item_id);
    if (item) {
      await supabase.from("items").update({
        available_quantity: Math.max(0, item.available_quantity - form.quantity),
        total_quantity: Math.max(0, item.available_quantity - form.quantity), // simplified
      }).eq("id", form.item_id);
    }

    toast.success("Item scrapped!");
    setOpen(false);
    setForm({ item_id: "", quantity: 1, reason: "" });
    fetchScraps();
    fetchItems();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl text-secondary">SCRAP ITEMS</h1>
            <p className="text-muted-foreground mt-1">Track scrapped and damaged equipment</p>
          </div>
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
                <Input type="number" min={1} placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} />
                <Input placeholder="Reason (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                <Button onClick={handleScrap} className="w-full bg-destructive hover:bg-destructive/90 font-semibold">Confirm Scrap</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reason</TableHead>
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
                    <TableCell>{format(new Date(s.scrapped_at), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
                {scraps.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No scrapped items</TableCell></TableRow>
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
