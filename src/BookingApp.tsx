import React, { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Check, QrCode, Plus, Minus, Loader2, Search } from 'lucide-react'
import { motion } from 'framer-motion'

export default function BookingApp() {
  const SUPABASE_URL = (window as any).SUPABASE_URL || 'YOUR_SUPABASE_URL'
  const SUPABASE_ANON_KEY = (window as any).SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'
  const supabase = useMemo(() => createClient(SUPABASE_URL, SUPABASE_ANON_KEY), [SUPABASE_URL, SUPABASE_ANON_KEY])

  const [items, setItems] = useState<Array<{ id: string; name: string; price_cents: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const qs = new URLSearchParams(window.location.search)
  const preselectItem = qs.get('item')

  const [displayId, setDisplayId] = useState<string>(() => localStorage.getItem('display_id') || '')
  const [rememberId, setRememberId] = useState<boolean>(() => !!localStorage.getItem('display_id'))

  const [selectedItemId, setSelectedItemId] = useState<string | null>(preselectItem)
  const [qty, setQty] = useState<number>(1)

  const [booking, setBooking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [balance, setBalance] = useState<number | null>(null)

  const [query, setQuery] = useState('')

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data, error } = await supabase.rpc('list_active_items')
      if (error) { setError(error.message); setLoading(false); return; }
      setItems(data || [])
      setLoading(false)
      if (preselectItem && data?.some((i: any) => i.id === preselectItem)) {
        setSelectedItemId(preselectItem)
      }
    })()
  }, [supabase])

  useEffect(() => {
    if (rememberId && displayId) localStorage.setItem('display_id', displayId)
    if (!rememberId) localStorage.removeItem('display_id')
  }, [rememberId, displayId])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(i => i.name.toLowerCase().includes(q))
  }, [items, query])

  const selectedItem = React.useMemo(() => items.find(i => i.id === selectedItemId) || null, [items, selectedItemId])

  const handleBook = async () => {
    setError(null); setMessage(null); setBalance(null)
    const id = displayId.trim()
    if (!id || !selectedItemId) { setError('Bitte ID und Produkt wählen.'); return; }
    setBooking(true)
    const { data, error } = await supabase.rpc('book_transaction', {
      _display_id: id, _item_id: selectedItemId, _qty: qty, _by: 'web'
    })
    setBooking(false)
    if (error) { setError(error.message); return; }
    const bal = data && data[0] ? Number(data[0].new_balance_cents) : null
    setBalance(bal); setMessage('Danke! Buchung erfasst.')
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-white to-slate-50 p-4 md:p-8'>
      <div className='mx-auto max-w-xl'>
        <header className='flex items-center gap-3 mb-4'>
          <div className='p-2 rounded-2xl bg-slate-100'><QrCode /></div>
          <div>
            <h1 className='text-2xl font-semibold'>Entnahme buchen</h1>
            <p className='text-sm text-slate-500'>QR gescannt? ID eingeben → Produkt wählen → Buchen.</p>
          </div>
        </header>

        <Card className='rounded-2xl shadow-sm'>
          <CardContent className='p-4 md:p-6 space-y-4'>
            <div className='space-y-2'>
              <label className='text-sm text-slate-600'>Deine ID</label>
              <div className='flex gap-2'>
                <Input placeholder='z. B. MAX23' value={displayId} onChange={e => setDisplayId(e.target.value)} className='flex-1' autoFocus inputMode='text' />
                <Button variant={rememberId ? 'default' : 'outline'} onClick={() => setRememberId(v => !v)} title='ID merken'>
                  <Check className={rememberId ? 'opacity-100' : 'opacity-30'} />
                </Button>
              </div>
              <p className='text-xs text-slate-500'>Wir speichern die ID nur lokal in deinem Gerät.</p>
            </div>

            <div className='space-y-2'>
              <label className='text-sm text-slate-600'>Menge</label>
              <div className='inline-flex items-center gap-2'>
                <Button variant='outline' onClick={() => setQty(q => Math.max(1, q - 1))}><Minus /></Button>
                <div className='w-12 text-center font-semibold'>{qty}</div>
                <Button variant='outline' onClick={() => setQty(q => Math.min(99, q + 1))}><Plus /></Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className='mt-6'>
          <div className='flex items-center gap-2 mb-3'>
            <div className='relative w-full'>
              <Search className='absolute left-3 top-2.5 h-4 w-4 text-slate-400' />
              <Input placeholder='Produkt suchen…' className='pl-9' value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            {selectedItem && (<Badge className='shrink-0' variant='secondary'>Ausgewählt</Badge>)}
          </div>

          {loading ? (
            <div className='flex items-center gap-2 text-slate-500'><Loader2 className='animate-spin' /> Lädt Produkte…</div>
          ) : error ? (
            <div className='text-red-600 text-sm'>{error}</div>
          ) : (
            <div className='grid grid-cols-2 gap-3'>
              {filtered.map(it => (
                <motion.button key={it.id} whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedItemId(it.id)}
                  className={`rounded-2xl border p-3 text-left shadow-sm hover:shadow transition ${selectedItemId === it.id ? 'ring-2 ring-slate-400' : ''}`}>
                  <div className='font-medium leading-tight'>{it.name}</div>
                  <div className='text-sm text-slate-600'>{(it.price_cents/100).toFixed(2)} €</div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        <div className='mt-6 flex items-center gap-3'>
          <Button className='flex-1 h-12 text-base' onClick={handleBook} disabled={booking}>
            {booking ? (<><Loader2 className='mr-2 h-4 w-4 animate-spin'/> Buchen…</>) : 'Buchen'}
          </Button>
          {selectedItem && (
            <div className='text-right text-sm text-slate-600'>
              <div>{selectedItem.name}</div>
              <div>{qty} × {(selectedItem.price_cents/100).toFixed(2)} €</div>
            </div>
          )}
        </div>

        {message && (<div className='mt-4 p-3 rounded-xl bg-green-50 text-green-800 border border-green-200'>{message}</div>)}
        {balance !== null && (<div className='mt-2 p-3 rounded-xl bg-slate-50 text-slate-800 border border-slate-200'>Aktueller Stand: <span className='font-semibold'>{(Number(balance)/100).toFixed(2)} €</span></div>)}

        <p className='mt-8 text-center text-xs text-slate-400'>Vertrauensbar · Buchung per ID · Daten in Supabase (EU)</p>
      </div>
    </div>
  )
}
