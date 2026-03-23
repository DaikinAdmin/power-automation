'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, RefreshCw, Save, Trash2 } from 'lucide-react';

const CURRENCIES = ['EUR', 'PLN', 'UAH', 'USD'] as const;
type Currency = typeof CURRENCIES[number];

interface ExchangeRate {
  id: string;
  from: Currency;
  to: Currency;
  rate: number;
  updatedAt: string;
}

export default function CurrencyExchangePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [rates, setRates] = useState<ExchangeRate[]>([]);

  const [editRates, setEditRates] = useState<Record<string, string>>({});
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [newFrom, setNewFrom] = useState<Currency | ''>('');
  const [newTo, setNewTo] = useState<Currency | ''>('');
  const [newRate, setNewRate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/currency-exchange');
      if (res.ok) {
        const data: ExchangeRate[] = await res.json();
        setRates(data);
        const map: Record<string, string> = {};
        data.forEach((r) => { map[`${r.from}_${r.to}`] = String(r.rate); });
        setEditRates(map);
      }
      else toast.error('Failed to fetch exchange rates');
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (from: Currency, to: Currency) => {
    const key = `${from}_${to}`;
    const rate = parseFloat(editRates[key] ?? '');
    if (isNaN(rate) || rate <= 0) {
      toast.error('Rate must be a positive number');
      return;
    }
    setUpdatingKey(key);
    try {
      const res = await fetch('/api/admin/currency-exchange', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, rate }),
      });
      if (res.ok) {
        toast.success(`Rate ${from} → ${to} updated`);
        fetchRates();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to update rate');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setUpdatingKey(null);
    }
  };

  const pairExists = (from: Currency, to: Currency) =>
    rates.some((r) => r.from === from && r.to === to);

  const handleAdd = async () => {
    if (!newFrom || !newTo) return;

    if (pairExists(newFrom, newTo)) {
      toast.error(`Rate ${newFrom} → ${newTo} already exists. Delete it first to replace it.`);
      return;
    }

    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) {
      toast.error('Rate must be a positive number');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/currency-exchange', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: newFrom, to: newTo, rate }),
      });
      if (res.ok) {
        toast.success(`Rate ${newFrom} → ${newTo} added`);
        setNewFrom('');
        setNewTo('');
        setNewRate('');
        fetchRates();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to add rate');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (from: Currency, to: Currency) => {
    const key = `${from}_${to}`;
    setDeletingKey(key);
    try {
      const res = await fetch('/api/admin/currency-exchange', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to }),
      });
      if (res.ok) {
        toast.success(`Rate ${from} → ${to} deleted`);
        fetchRates();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to delete rate');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setDeletingKey(null);
    }
  };

  const toOptions = newFrom ? CURRENCIES.filter((c) => c !== newFrom) : CURRENCIES;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Currency Exchange Rates</h1>
        <p className="text-gray-600">Manage exchange rates between currencies</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Exchange Rates</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchRates} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-6 py-3 font-medium text-gray-500">Currency From</th>
                <th className="px-6 py-3 font-medium text-gray-500">Currency To</th>
                <th className="px-6 py-3 font-medium text-gray-500">Rate</th>
                <th className="px-6 py-3 font-medium text-gray-500 w-36">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : rates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                    No exchange rates defined yet
                  </td>
                </tr>
              ) : (
                rates.map((rate) => {
                  const key = `${rate.from}_${rate.to}`;
                  return (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-semibold">{rate.from}</td>
                      <td className="px-6 py-3 font-semibold">{rate.to}</td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={editRates[key] ?? ''}
                          onChange={(e) =>
                            setEditRates((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="w-32"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdate(rate.from, rate.to)}
                            disabled={updatingKey === key || deletingKey === key}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Update
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(rate.from, rate.to)}
                            disabled={deletingKey === key || updatingKey === key}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}

              {/* New rate row */}
              <tr className="bg-blue-50 border-t-2 border-blue-200">
                <td className="px-4 py-3">
                  <Select
                    value={newFrom}
                    onValueChange={(v) => {
                      setNewFrom(v as Currency);
                      setNewTo('');
                    }}
                  >
                    <SelectTrigger className="w-28 bg-white">
                      <SelectValue placeholder="From" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={newTo}
                    onValueChange={(v) => setNewTo(v as Currency)}
                    disabled={!newFrom}
                  >
                    <SelectTrigger className="w-28 bg-white">
                      <SelectValue placeholder="To" />
                    </SelectTrigger>
                    <SelectContent>
                      {toOptions.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="e.g. 4.25"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    className="w-32 bg-white"
                  />
                </td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    onClick={handleAdd}
                    disabled={!newFrom || !newTo || !newRate || isSaving}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Rate
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
