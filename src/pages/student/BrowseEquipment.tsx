import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { Search, ShoppingCart, Package } from "lucide-react";

const BrowseEquipment = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [borrowDialog, setBorrowDialog] = useState<any | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [purpose, setPurpose] = useState("");

  const fetchItems = async () => {
    const { data } = await supabase.from("items").select("*").order("name");
    setItems(data ?? []);
  };

  useEffect(() => { fetchItems(); }, []);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleBorrow = async () => {
    if (!user || !borrowDialog) return;
    if (quantity > borrowDialog.available_quantity) { toast.error("Not enough available"); return; }

    const { error } = await supabase.from("borrow_records").insert({
      item_id: borrowDialog.id,
      user_id: user.id,
      quantity,
      purpose: purpose || null,
    });
    if (error) { toast.error(error.message); return; }

    // Decrease available quantity
    await supabase.from("items").update({
      available_quantity: borrowDialog.available_quantity - quantity,
    }).eq("id", borrowDialog.id);

    toast.success("Equipment borrowed successfully!");
    setBorrowDialog(null);
    setQuantity(1);
    setPurpose("");
    fetchItems();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-5xl text-secondary">BROWSE EQUIPMENT</h1>
          <p className="text-muted-foreground mt-1">Find and borrow sports equipment</p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <Card key={item.id} className="border-0 shadow-md hover:shadow-lg transition-all group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <Badge variant="secondary">{item.category}</Badge>
                </div>
                <h3 className="text-lg font-bold mb-1">{item.name}</h3>
                {item.description && <p className="text-sm text-muted-foreground mb-3">{item.description}</p>}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">
                    Available: <span className={item.available_quantity === 0 ? "text-destructive font-bold" : "font-bold text-foreground"}>{item.available_quantity}</span>/{item.total_quantity}
                  </span>
                  <Badge variant={item.condition === "New" ? "default" : "secondary"}>{item.condition}</Badge>
                </div>
                <Button
                  onClick={() => setBorrowDialog(item)}
                  disabled={item.available_quantity === 0}
                  className="w-full gap-2 font-semibold"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {item.available_quantity === 0 ? "Out of Stock" : "Borrow"}
                </Button>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">No equipment found</div>
          )}
        </div>

        <Dialog open={!!borrowDialog} onOpenChange={() => setBorrowDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                BORROW {borrowDialog?.name?.toUpperCase()}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <label className="text-sm font-medium">Quantity (max: {borrowDialog?.available_quantity})</label>
                <Input
                  type="number"
                  min={1}
                  max={borrowDialog?.available_quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(+e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Purpose (optional)</label>
                <Input
                  placeholder="e.g., Tournament practice"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleBorrow} className="w-full font-semibold gap-2">
                <ShoppingCart className="h-4 w-4" /> Confirm Borrow
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default BrowseEquipment;
