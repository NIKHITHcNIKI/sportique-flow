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
import { mapDbError } from "@/lib/error-mapper";
import { Search, ShoppingCart, Package, Plus, Minus, Trash2, X } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  category: string;
  available_quantity: number;
  quantity: number;
  purpose: string;
}

const BrowseEquipment = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [borrowing, setBorrowing] = useState(false);

  const fetchItems = async () => {
    const { data } = await supabase.from("items").select("*").order("name");
    setItems(data ?? []);
  };

  useEffect(() => { fetchItems(); }, []);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (item: any) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      if (existing.quantity >= item.available_quantity) {
        toast.error("Cannot add more — max stock reached");
        return;
      }
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, {
        id: item.id,
        name: item.name,
        category: item.category,
        available_quantity: item.available_quantity,
        quantity: 1,
        purpose: "",
      }]);
    }
    toast.success(`${item.name} added to cart`);
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.id !== id) return c;
      const newQty = c.quantity + delta;
      if (newQty < 1 || newQty > c.available_quantity) return c;
      return { ...c, quantity: newQty };
    }));
  };

  const updateCartPurpose = (id: string, purpose: string) => {
    setCart(cart.map(c => c.id === id ? { ...c, purpose } : c));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(c => c.id !== id));
  };

  const getCartQty = (itemId: string) => cart.find(c => c.id === itemId)?.quantity ?? 0;

  const handleBorrowAll = async () => {
    if (!user || cart.length === 0) return;
    setBorrowing(true);

    // Validate cart items client-side
    for (const item of cart) {
      if (item.quantity < 1 || item.quantity > 9999) {
        toast.error(`Invalid quantity for ${item.name}`);
        setBorrowing(false);
        return;
      }
      if (item.purpose && item.purpose.length > 500) {
        toast.error(`Purpose too long for ${item.name}`);
        setBorrowing(false);
        return;
      }
    }

    // Use atomic borrow_cart function for transactional safety
    const cartItems = cart.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      purpose: item.purpose ? item.purpose.trim().slice(0, 500) : "",
    }));

    const { data: success, error: rpcError } = await supabase.rpc("borrow_cart", {
      _user_id: user.id,
      _items: cartItems,
    });

    if (rpcError || !success) {
      toast.error(rpcError ? mapDbError(rpcError) : "Failed to borrow items. Please try again.");
      setBorrowing(false);
      fetchItems();
      return;
    }

    toast.success(`Successfully borrowed ${cart.length} item(s)!`);
    setCart([]);
    setCartOpen(false);
    setBorrowing(false);
    fetchItems();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl text-secondary">BROWSE EQUIPMENT</h1>
            <p className="text-muted-foreground mt-1">Find and borrow sports equipment</p>
          </div>
          <Button
            onClick={() => setCartOpen(true)}
            variant="outline"
            className="gap-2 font-semibold relative"
          >
            <ShoppingCart className="h-5 w-5" />
            Cart
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </Button>
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
          {filtered.map((item) => {
            const inCart = getCartQty(item.id);
            const outOfStock = item.available_quantity === 0;
            return (
              <Card key={item.id} className={`border-0 shadow-md hover:shadow-lg transition-all group ${outOfStock ? "opacity-60" : ""}`}>
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
                    {outOfStock ? (
                      <Badge variant="destructive" className="text-sm">Out of Stock</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Stock: <span className="font-bold text-foreground">{item.available_quantity}</span>/{item.total_quantity}
                      </span>
                    )}
                    <Badge variant={item.condition === "New" ? "default" : "secondary"}>{item.condition}</Badge>
                  </div>
                  <Button
                    onClick={() => addToCart(item)}
                    disabled={outOfStock || inCart >= item.available_quantity}
                    className="w-full gap-2 font-semibold"
                  >
                    {outOfStock ? (
                      <>Out of Stock</>
                    ) : inCart > 0 ? (
                      <><Plus className="h-4 w-4" /> In Cart ({inCart}) — Add More</>
                    ) : (
                      <><Plus className="h-4 w-4" /> Add to Cart</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">No equipment found</div>
          )}
        </div>

        {/* Cart Dialog */}
        <Dialog open={cartOpen} onOpenChange={setCartOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                YOUR CART ({cart.length} ITEMS)
              </DialogTitle>
            </DialogHeader>
            {cart.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Your cart is empty. Add items from the browse page.</p>
            ) : (
              <div className="space-y-4 mt-2 max-h-[60vh] overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold">{item.name}</h4>
                        <span className="text-xs text-muted-foreground">{item.category} · Stock: {item.available_quantity}</span>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeFromCart(item.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">Qty:</span>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateCartQty(item.id, -1)} disabled={item.quantity <= 1}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateCartQty(item.id, 1)} disabled={item.quantity >= item.available_quantity}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Input
                      placeholder="Purpose (optional)"
                      value={item.purpose}
                      onChange={(e) => updateCartPurpose(item.id, e.target.value)}
                      className="text-sm"
                      maxLength={500}
                    />
                  </div>
                ))}
                <Button onClick={handleBorrowAll} disabled={borrowing} className="w-full font-semibold gap-2 mt-4">
                  <ShoppingCart className="h-4 w-4" />
                  {borrowing ? "Borrowing..." : `Borrow All (${cart.reduce((s, c) => s + c.quantity, 0)} items)`}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default BrowseEquipment;
