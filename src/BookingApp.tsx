import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, QrCode, Plus, Minus, Loader2, Search } from "lucide-react";
import { motion } from "framer-motion";

// NOTE: Fixed JSX typo: replaced erroneous </n> with </div> in the product tile.
// TODO (tests): We can add a Vitest + React Testing Library spec that mounts BookingApp
// and asserts: (1) renders product buttons, (2) disables Buchen without ID or selection,
// (3) computes total and after-balance correctly. Ask to generate tests if desired.

export default function BookingApp() {
  const SUPABASE_URL = (window as any).SUPABASE_URL || "https://kidgyvntrfitsjegieck.supabase.co";
  const SUPABASE_ANON_KEY = (window as any).SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGd5dm50cmZpdHNqZWdpZWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MTc0NDYsImV4cCI6MjA3MzA5MzQ0Nn0.3zkQZYBkmEIAIr7XsKMSJu4VQd6fSekr_CSoHOOM5P8"; // gekürzt
  const supabase = useMemo(() => createClient(SUPABASE_URL, SUPABASE_ANON_KEY), [SUPABASE_URL, SUPABASE_ANON_KEY]);

  const [items, setItems] = useState<Array<{ id: string; name: string; price_cents: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const qs = new URLSearchParams(window.location.search);
  const preselectItem = qs.get("item");

  const [displayId, setDisplayId] = useState<string>(() => localStorage.getItem("display_id") || "");
  const [rememberId, setRememberId] = useState<boolean>(() => !!localStorage.getItem("display_id"));

  const [selectedItemId, setSelectedItemId] = useState<string | null>(preselectItem);
  const [qty, setQty] = useState<number>(1);

  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null); // Balance nach Buchung
  const [liveBalance, setLiveBalance] = useState<number | null>(null); // Vorläufiger Buchungsstand (live)
  const [loadingBalance, setLoadingBalance] = useState(false);

  const [query, setQuery] = useState("");

  // Produkte laden
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_active_items");
      if (error) { setError(error.message); setLoading(false); return; }
      setItems(data || []);
      setLoading(false);
      if (preselectItem && data?.some((i: any) => i.id === preselectItem)) {
        setSelectedItemId(preselectItem);
      }
    })();
  }, [supabase]);

  // ID merken / unmerken
  useEffect(() => {
    if (rememberId && displayId) localStorage.setItem("display_id", displayId);
    if (!rememberId) localStorage.removeItem("display_id");
  }, [rememberId, displayId]);

  // Live-Saldo beim Tippen der ID (debounced)
  useEffect(() => {
    const id = displayId.trim();
    if (!id) { setLiveBalance(null); return; }
    setLoadingBalance(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("get_balance_by_display_id", { _display_id: id });
      setLoadingBalance(false);
      if (error || !data || !data[0]) { setLiveBalance(null); return; }
      setLiveBalance(Number(data[0].balance_cents));
    }, 350);
    return () => clearTimeout(t);
  }, [displayId, supabase]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => i.name.toLowerCase().includes(q));
  }, [items, query]);

  const selectedItem = useMemo(() => items.find(i => i.id === selectedItemId) || null, [items, selectedItemId]);

  const totalCents = selectedItem ? qty * selectedItem.price_cents : 0;
  const totalEu = (totalCents / 100).toFixed(2);
  const afterCents = liveBalance !== null && selectedItem ? liveBalance - totalCents : null; // Entnahme zieht ab

const handleBook = async () => {
  setError(null);
  setMessage(null);
  setBalance(null);
  const id = displayId.trim();
  if (!id || !selectedItemId) { 
    setError("Bitte ID und Produkt wählen."); 
    return; 
  }
  setBooking(true);
  const { data, error } = await supabase.rpc("book_transaction", {
    _display_id: id,
    _item_id: selectedItemId,
    _qty: qty,
    _by: "web"
  });
  setBooking(false);
  if (error) { setError(error.message); return; }
  const bal = data && data[0] ? Number(data[0].new_balance_cents) : null;
  setBalance(bal);
  setLiveBalance(bal); // sofort aktualisieren
  setMessage("Danke! Buchung erfasst.");

  // ✅ Produktauswahl & Menge zurücksetzen, ID bleibt bestehen
  setSelectedItemId(null);
  setQty(1);
  setQuery("");
};

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-xl">
        <header className="flex items-center gap-3 mb-4">
          <div className="rounded-3xl p-3 shadow-sm border bg-white"><QrCode /></div>
          <div>
            <h1 className="text-2xl font-semibold">Entnahme buchen</h1>
            <p className="text-sm text-slate-500">QR gescannt? ID eingeben → Produkt wählen → Buchen.</p>
          </div>
        </header>

        {/* ID Eingabe */}
        <Card className="rounded-3xl shadow-sm border border-slate-200 bg-white/90 backdrop-blur">
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-600">Deine ID</label>
              <div className="flex gap-2">
                <Input
                  placeholder="z. B. MAX23"
                  value={displayId}
                  onChange={e => setDisplayId(e.target.value)}
                  className="flex-1"
                  autoFocus
                  inputMode="text"
                />
                <Button variant={rememberId ? "default" : "outline"} onClick={() => setRememberId(v => !v)} title="ID merken">
                  <Check className={rememberId ? "opacity-100" : "opacity-30"} />
                </Button>
              </div>
              <p className="text-xs text-slate-500">Wir speichern die ID nur lokal in deinem Gerät.</p>
              {/* Vorläufiger Buchungsstand (live) */}
              {displayId.trim() && (
                <div className="text-sm text-slate-600">
                  {loadingBalance ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Lade Buchungsstand…</span>
                  ) : liveBalance !== null ? (
                    <>Vorläufiger Buchungsstand: <span className="font-semibold">{(liveBalance/100).toFixed(2)} €</span></>
                  ) : (
                    <span className="text-slate-400">ID nicht gefunden</span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Produktauswahl */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Produkt suchen…" className="pl-9" value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            {selectedItem && (
              <Badge className="shrink-0" variant="secondary">Ausgewählt</Badge>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-slate-500"><Loader2 className="animate-spin" /> Lädt Produkte…</div>
          ) : error ? (
            <div className="text-red-600 text-sm">{error}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map(it => (
                <motion.button
                  key={it.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedItemId(it.id)}
                  className={`rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:shadow-md transition-all ${selectedItemId === it.id ? 'ring-2 ring-slate-300 bg-slate-50' : ''}`}
                >
                  <div className="font-medium leading-tight">{it.name}</div>
                  <div className="text-sm text-slate-600">{(it.price_cents/100).toFixed(2)} €</div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Sticky-Leiste: Menge + Gesamtsumme + Buchen */}
        <div className="mt-6">
          <div className="sticky bottom-4 z-40">
            <div className="flex items-center gap-3 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border shadow-lg rounded-2xl p-3">
              {selectedItem ? (
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setQty(q => Math.max(1, q - 1))}><Minus /></Button>
                    <div className="w-10 text-center font-semibold">{qty}</div>
                    <Button variant="outline" onClick={() => setQty(q => Math.min(99, q + 1))}><Plus /></Button>
                  </div>
                  <div className="text-sm text-slate-700">
                    <div className="font-medium">{selectedItem.name}</div>
                    <div className="text-slate-500">Einzelpreis {(selectedItem.price_cents/100).toFixed(2)} €</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-xs text-slate-500">Gesamtsumme</div>
                    <div className="text-lg font-semibold">{totalEu} €</div>
                    {afterCents !== null && (
                      <div className="text-xs text-slate-500">nach Buchung: {(afterCents/100).toFixed(2)} €</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 text-sm text-slate-400">Bitte ein Produkt wählen</div>
              )}
              <Button className="h-12 text-base px-6" onClick={handleBook} disabled={booking || !selectedItemId || !displayId.trim()}>
                {booking ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Buchen…</>) : "Buchen"}
              </Button>
            </div>
          </div>
        </div>

        {message && (
          <div className="mt-4 p-3 rounded-xl bg-green-50 text-green-800 border border-green-200">
            {message}
          </div>
        )}
        {balance !== null && (
          <div className="mt-2 p-3 rounded-xl bg-slate-50 text-slate-800 border border-slate-200">
            Aktueller Stand: <span className="font-semibold">{(Number(balance)/100).toFixed(2)} €</span>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">Vertrauensbar · Buchung per ID · Daten in Supabase (EU)</p>
      </div>
    </div>
  );
}

// EOF
