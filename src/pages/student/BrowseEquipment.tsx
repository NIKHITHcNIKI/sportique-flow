import { useEffect, useState, useMemo } from "react";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import CameraCapture from "@/components/CameraCapture";
import {
  Search, ShoppingCart, Plus, Minus, Trash2,
  CircleDot, Target, Disc, Dumbbell, Trophy,
  Footprints, Volleyball, Timer, Bike, Gamepad2
} from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  category: string;
  available_quantity: number;
  quantity: number;
  purpose: string;
}

const CATEGORY_CONFIG: Record<string, { icon: any; emoji: string; color: string }> = {
  "Cricket Equipment": { icon: CircleDot, emoji: "🏏", color: "bg-amber-500/15 text-amber-600" },
  "Badminton / Shuttle Equipment": { icon: Target, emoji: "🏸", color: "bg-green-500/15 text-green-600" },
  "Table Tennis Equipment": { icon: Disc, emoji: "🏓", color: "bg-blue-500/15 text-blue-600" },
  "Volleyball Equipment": { icon: Volleyball, emoji: "🏐", color: "bg-orange-500/15 text-orange-600" },
  "Basketball Equipment": { icon: CircleDot, emoji: "🏀", color: "bg-orange-600/15 text-orange-700" },
  "Football Equipment": { icon: CircleDot, emoji: "⚽", color: "bg-emerald-500/15 text-emerald-600" },
  "Handball Equipment": { icon: CircleDot, emoji: "🤾", color: "bg-red-500/15 text-red-600" },
  "Throw Ball Equipment": { icon: CircleDot, emoji: "🏐", color: "bg-pink-500/15 text-pink-600" },
  "Ball Badminton Equipment": { icon: Target, emoji: "🥍", color: "bg-violet-500/15 text-violet-600" },
  "Athletics Equipment": { icon: Footprints, emoji: "🥏", color: "bg-sky-500/15 text-sky-600" },
  "Fitness / Gym Equipment": { icon: Dumbbell, emoji: "🧘", color: "bg-rose-500/15 text-rose-600" },
  "Indoor Games Equipment": { icon: Gamepad2, emoji: "🎯", color: "bg-indigo-500/15 text-indigo-600" },
  "Other Sports Equipment": { icon: Trophy, emoji: "🏆", color: "bg-yellow-500/15 text-yellow-600" },
  "Accessories / Utility Items": { icon: Timer, emoji: "🎽", color: "bg-slate-500/15 text-slate-600" },
};

const getCategoryConfig = (category: string) =>
  CATEGORY_CONFIG[category] ?? { icon: Trophy, emoji: "🏅", color: "bg-muted text-muted-foreground" };

const BrowseEquipment = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [borrowing, setBorrowing] = useState(false);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const fetchItems = async () => {
    const { data } = await supabase.from("items").select("*").order("name");
    setItems(data ?? []);
  };

  useEffect(() => { fetchItems(); }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(items.map(i => i.category))];
    return cats.sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      const matchesSearch = search === "" ||
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !selectedCategory || i.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, selectedCategory]);

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
        id: item.id, name: item.name, category: item.category,
        available_quantity: item.available_quantity, quantity: 1, purpose: "",
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

  const removeFromCart = (id: string) => setCart(cart.filter(c => c.id !== id));

  const getCartQty = (itemId: string) => cart.find(c => c.id === itemId)?.quantity ?? 0;

  const handlePhotoCapture = (blob: Blob) => {
    setPhotoBlob(blob);
    setPhotoPreview(URL.createObjectURL(blob));
  };

  const clearPhoto = () => {
    setPhotoBlob(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  const handleBorrowAll = async () => {
    if (!user || cart.length === 0) return;
    if (!photoBlob) {
      toast.error("Please take a photo of the items before borrowing");
      return;
    }
    setBorrowing(true);
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

    // Upload photo
    const fileName = `borrow_${user.id}_${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("borrow-photos")
      .upload(fileName, photoBlob, { contentType: "image/jpeg" });
    if (uploadError) {
      toast.error("Failed to upload photo. Please try again.");
      setBorrowing(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("borrow-photos").getPublicUrl(fileName);
    const photoUrl = urlData.publicUrl;

    const cartItems = cart.map(item => ({
      id: item.id, name: item.name, quantity: item.quantity,
      purpose: item.purpose ? item.purpose.trim().slice(0, 500) : "",
    }));
    const { data: success, error: rpcError } = await supabase.rpc("borrow_cart", {
      _user_id: user.id, _items: cartItems,
    });
    if (rpcError || !success) {
      toast.error(rpcError ? mapDbError(rpcError) : "Failed to borrow items. Please try again.");
      setBorrowing(false);
      fetchItems();
      return;
    }

    // Update borrow records with photo URL (for records just created)
    // Get the latest borrow records for this user matching cart items
    const { data: latestRecords } = await supabase
      .from("borrow_records")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "borrowed")
      .is("borrow_photo_url", null)
      .order("created_at", { ascending: false })
      .limit(cart.length);

    if (latestRecords && latestRecords.length > 0) {
      const ids = latestRecords.map(r => r.id);
      await supabase
        .from("borrow_records")
        .update({ borrow_photo_url: photoUrl })
        .in("id", ids);
    }

    toast.success(`Successfully borrowed ${cart.length} item(s)!`);
    setCart([]);
    clearPhoto();
    setCartOpen(false);
    setBorrowing(false);
    fetchItems();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl text-secondary">BROWSE EQUIPMENT</h1>
            <p className="text-muted-foreground mt-1">Find and borrow sports equipment</p>
          </div>
          <Button onClick={() => setCartOpen(true)} variant="outline" className="gap-2 font-semibold relative">
            <ShoppingCart className="h-5 w-5" /> Cart
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or category..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11" />
        </div>

        {/* Category Filter Chips */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="rounded-full font-semibold shrink-0"
            >
              All ({items.length})
            </Button>
            {categories.map(cat => {
              const config = getCategoryConfig(cat);
              const count = items.filter(i => i.category === cat).length;
              return (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                  className="rounded-full font-semibold shrink-0 gap-1.5"
                >
                  <span>{config.emoji}</span> {cat} ({count})
                </Button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item) => {
            const inCart = getCartQty(item.id);
            const outOfStock = item.available_quantity === 0;
            const config = getCategoryConfig(item.category);
            return (
              <Card key={item.id} className={`border-0 shadow-md hover:shadow-lg transition-all group ${outOfStock ? "opacity-50" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${config.color}`}>
                      {config.emoji}
                    </div>
                    {inCart > 0 && (
                      <Badge className="bg-primary text-primary-foreground">In Cart: {inCart}</Badge>
                    )}
                  </div>
                  <h3 className="text-base font-bold mb-1 leading-tight">{item.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{item.category}</p>
                  <div className="flex items-center justify-between mb-4">
                    {outOfStock ? (
                      <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-0.5">
                          {Array.from({ length: Math.min(item.available_quantity, 6) }).map((_, i) => (
                            <div key={i} className="w-2 h-2 rounded-full bg-primary/70" />
                          ))}
                          {item.available_quantity > 6 && (
                            <span className="text-xs text-muted-foreground ml-1">+{item.available_quantity - 6}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground ml-1">
                          {item.available_quantity}/{item.total_quantity}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => addToCart(item)}
                    disabled={outOfStock || inCart >= item.available_quantity}
                    size="sm"
                    className="w-full gap-1.5 font-semibold"
                  >
                    {outOfStock ? "Unavailable" : inCart > 0 ? (
                      <><Plus className="h-3.5 w-3.5" /> Add More</>
                    ) : (
                      <><Plus className="h-3.5 w-3.5" /> Add to Cart</>
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
                {cart.map((item) => {
                  const config = getCategoryConfig(item.category);
                  return (
                    <div key={item.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{config.emoji}</span>
                          <div>
                            <h4 className="font-bold text-sm">{item.name}</h4>
                            <span className="text-xs text-muted-foreground">{item.category} · Stock: {item.available_quantity}</span>
                          </div>
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
                      <Input placeholder="Purpose (optional)" value={item.purpose} onChange={(e) => updateCartPurpose(item.id, e.target.value)} className="text-sm" maxLength={500} />
                    </div>
                  );
                })}

                {/* Camera capture - mandatory */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <CameraCapture
                    onCapture={handlePhotoCapture}
                    capturedPreview={photoPreview}
                    onClear={clearPhoto}
                    label="📸 Take photo of items (required)"
                  />
                </div>

                <Button onClick={handleBorrowAll} disabled={borrowing || !photoBlob} className="w-full font-semibold gap-2 mt-4">
                  <ShoppingCart className="h-4 w-4" />
                  {borrowing ? "Borrowing..." : `Borrow All (${cart.reduce((s, c) => s + c.quantity, 0)} items)`}
                </Button>
                {!photoBlob && (
                  <p className="text-xs text-destructive text-center">⚠️ Photo is required before borrowing</p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default BrowseEquipment;
