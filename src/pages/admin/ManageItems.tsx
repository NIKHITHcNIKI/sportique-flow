import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { mapDbError } from "@/lib/error-mapper";
import { Plus, Edit, Trash2, Package, Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { downloadCSV } from "@/lib/csv-export";
import { generatePDFReport } from "@/lib/pdf-report";

type Item = {
  id: string;
  name: string;
  category: string;
  total_quantity: number;
  available_quantity: number;
  condition: string;
  description: string | null;
};

const ManageItems = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form, setForm] = useState({ name: "", category: "Cricket Equipment", total_quantity: 0, available_quantity: 0, condition: "Good", description: "" });

  const fetchItems = async () => {
    const { data } = await supabase.from("items").select("*").order("name");
    setItems(data ?? []);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    if (!form.name || form.name.trim().length === 0) { toast.error("Name is required"); return; }
    if (form.name.length > 100) { toast.error("Name must be under 100 characters"); return; }
    if (form.description && form.description.length > 500) { toast.error("Description must be under 500 characters"); return; }
    if (form.total_quantity < 0 || form.total_quantity > 99999) { toast.error("Total quantity must be between 0 and 99999"); return; }
    if (form.available_quantity < 0 || form.available_quantity > form.total_quantity) { toast.error("Available quantity must be between 0 and total quantity"); return; }

    const sanitizedForm = {
      ...form,
      name: form.name.trim().slice(0, 100),
      description: form.description ? form.description.trim().slice(0, 500) : "",
    };

    if (editingItem) {
      const { error } = await supabase.from("items").update(sanitizedForm).eq("id", editingItem.id);
      if (error) toast.error(mapDbError(error));
      else toast.success("Item updated!");
    } else {
      const { error } = await supabase.from("items").insert(sanitizedForm);
      if (error) toast.error(mapDbError(error));
      else toast.success("Item added!");
    }
    setOpen(false);
    setEditingItem(null);
    setForm({ name: "", category: "Cricket Equipment", total_quantity: 0, available_quantity: 0, condition: "Good", description: "" });
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) toast.error(mapDbError(error));
    else { toast.success("Item deleted"); fetchItems(); }
  };

  const openEdit = (item: Item) => {
    setEditingItem(item);
    setForm({ name: item.name, category: item.category, total_quantity: item.total_quantity, available_quantity: item.available_quantity, condition: item.condition, description: item.description ?? "" });
    setOpen(true);
  };

  const openNew = () => {
    setEditingItem(null);
    setForm({ name: "", category: "Cricket Equipment", total_quantity: 0, available_quantity: 0, condition: "Good", description: "" });
    setOpen(true);
  };

  const downloadFile = () => {
    const data = items.map((item) => ({
      Name: item.name,
      Category: item.category,
      "Total Quantity": item.total_quantity,
      "Available Quantity": item.available_quantity,
      Condition: item.condition,
      Description: item.description ?? "",
    }));
    downloadCSV(data, "equipment_items.csv");
    toast.success("Downloaded items list!");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl text-secondary">MANAGE ITEMS</h1>
            <p className="text-muted-foreground mt-1">Add, edit and remove equipment</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={downloadFile} variant="outline" className="gap-2 font-semibold">
              <Download className="h-4 w-4" /> Download CSV
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNew} className="gap-2 font-semibold">
                  <Plus className="h-4 w-4" /> Add Item
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-2xl" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  {editingItem ? "EDIT ITEM" : "ADD NEW ITEM"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <Input placeholder="Item Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} />
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Cricket Equipment", "Badminton / Shuttle Equipment", "Table Tennis Equipment", "Volleyball Equipment", "Basketball Equipment", "Football Equipment", "Handball Equipment", "Throw Ball Equipment", "Ball Badminton Equipment", "Athletics Equipment", "Fitness / Gym Equipment", "Indoor Games Equipment", "Other Sports Equipment", "Accessories / Utility Items"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-3">
                  <Input type="number" placeholder="Total Qty" min={0} max={99999} value={form.total_quantity} onChange={(e) => setForm({ ...form, total_quantity: Math.max(0, Math.min(99999, +e.target.value)) })} />
                  <Input type="number" placeholder="Available Qty" min={0} max={99999} value={form.available_quantity} onChange={(e) => setForm({ ...form, available_quantity: Math.max(0, Math.min(99999, +e.target.value)) })} />
                </div>
                <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["New", "Good", "Fair", "Poor"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} />
                <Button onClick={handleSave} className="w-full font-semibold">{editingItem ? "Update" : "Add"} Item</Button>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      {item.name}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                    <TableCell>{item.total_quantity}</TableCell>
                    <TableCell className={item.available_quantity === 0 ? "text-destructive font-semibold" : ""}>{item.available_quantity}</TableCell>
                    <TableCell>{item.condition}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No items yet. Add your first item!</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ManageItems;
