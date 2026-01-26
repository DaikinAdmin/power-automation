'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowRight, RefreshCw, Save } from 'lucide-react';
import type { Currency } from '@/db/schema';
import { formatDate } from '@/helpers/formatting';

// Currency enum values as constants
const CURRENCY = {
  EUR: 'EUR' as const,
  PLN: 'PLN' as const,
  UAH: 'UAH' as const,
};

interface CurrencyExchange {
  id: string;
  from: Currency;
  to: Currency;
  rate: number;
  updatedAt: Date;
}

export default function CurrencyExchangePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [exchangeRates, setExchangeRates] = useState<CurrencyExchange[]>([]);
  const [editRates, setEditRates] = useState<Record<string, number>>({});
  
  useEffect(() => {
    fetchExchangeRates();
  }, []);

  const fetchExchangeRates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/currency-exchange');
      if (response.ok) {
        const data = await response.json();
        setExchangeRates(data);
        
        // Initialize edit rates with current values
        const rates: Record<string, number> = {};
        data.forEach((exchange: CurrencyExchange) => {
          rates[`${exchange.from}_${exchange.to}`] = exchange.rate;
        });
        setEditRates(rates);
      } else {
        toast.error("Error", {
          description: "Failed to fetch exchange rates",
        });
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      toast.error("Error", {
        description: "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRateChange = (from: Currency, to: Currency, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setEditRates(prev => ({
        ...prev,
        [`${from}_${to}`]: numValue
      }));
    }
  };

  const updateExchangeRate = async (from: Currency, to: Currency) => {
    const key = `${from}_${to}`;
    const newRate = editRates[key];
    
    if (newRate <= 0) {
      toast.error("Invalid Rate", {
        description: "Exchange rate must be greater than zero",
      });
      return;
    }
    
    try {
      const response = await fetch('/api/admin/currency-exchange', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to,
          rate: newRate
        }),
      });
      
      if (response.ok) {
        toast.success(`Exchange rate from ${from} to ${to} updated successfully`);
        fetchExchangeRates(); // Refresh data
      } else {
        const error = await response.json();
        toast.error("Error", {
          description: error.message || "Failed to update exchange rate",
        });
      }
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      toast.error("Error", {
        description: "An unexpected error occurred",
      });
    }
  };

  const getCurrencyPair = (from: Currency, to: Currency) => {
    return exchangeRates.find(rate => rate.from === from && rate.to === to);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Currency Exchange Rates</h1>
        <p className="text-gray-600">
          Manage exchange rates between different currencies
        </p>
      </div>
      
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          onClick={fetchExchangeRates}
          disabled={isLoading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Rates
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* EUR to PLN */}
        <CurrencyExchangeCard
          title="EUR to PLN"
          description="Euro to Polish Złoty exchange rate"
          fromCurrency={CURRENCY.EUR}
          toCurrency={CURRENCY.PLN}
          exchangeRate={getCurrencyPair(CURRENCY.EUR, CURRENCY.PLN)}
          editRate={editRates[`${CURRENCY.EUR}_${CURRENCY.PLN}`]}
          onRateChange={(value) => handleRateChange(CURRENCY.EUR, CURRENCY.PLN, value)}
          onSave={() => updateExchangeRate(CURRENCY.EUR, CURRENCY.PLN)}
          isLoading={isLoading}
        />
        
        {/* EUR to UAH */}
        <CurrencyExchangeCard
          title="EUR to UAH"
          description="Euro to Ukrainian Hryvnia exchange rate"
          fromCurrency={CURRENCY.EUR}
          toCurrency={CURRENCY.UAH}
          exchangeRate={getCurrencyPair(CURRENCY.EUR, CURRENCY.UAH)}
          editRate={editRates[`${CURRENCY.EUR}_${CURRENCY.UAH}`]}
          onRateChange={(value) => handleRateChange(CURRENCY.EUR, CURRENCY.UAH, value)}
          onSave={() => updateExchangeRate(CURRENCY.EUR, CURRENCY.UAH)}
          isLoading={isLoading}
        />
        
        {/* PLN to EUR */}
        <CurrencyExchangeCard
          title="PLN to EUR"
          description="Polish Złoty to Euro exchange rate"
          fromCurrency={CURRENCY.PLN}
          toCurrency={CURRENCY.EUR}
          exchangeRate={getCurrencyPair(CURRENCY.PLN, CURRENCY.EUR)}
          editRate={editRates[`${CURRENCY.PLN}_${CURRENCY.EUR}`]}
          onRateChange={(value) => handleRateChange(CURRENCY.PLN, CURRENCY.EUR, value)}
          onSave={() => updateExchangeRate(CURRENCY.PLN, CURRENCY.EUR)}
          isLoading={isLoading}
        />
        
        {/* UAH to EUR */}
        <CurrencyExchangeCard
          title="UAH to EUR"
          description="Ukrainian Hryvnia to Euro exchange rate"
          fromCurrency={CURRENCY.UAH}
          toCurrency={CURRENCY.EUR}
          exchangeRate={getCurrencyPair(CURRENCY.UAH, CURRENCY.EUR)}
          editRate={editRates[`${CURRENCY.UAH}_${CURRENCY.EUR}`]}
          onRateChange={(value) => handleRateChange(CURRENCY.UAH, CURRENCY.EUR, value)}
          onSave={() => updateExchangeRate(CURRENCY.UAH, CURRENCY.EUR)}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

interface CurrencyExchangeCardProps {
  title: string;
  description: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  exchangeRate?: CurrencyExchange;
  editRate?: number;
  onRateChange: (value: string) => void;
  onSave: () => void;
  isLoading: boolean;
}

function CurrencyExchangeCard({
  title,
  description,
  fromCurrency,
  toCurrency,
  exchangeRate,
  editRate,
  onRateChange,
  onSave,
  isLoading
}: CurrencyExchangeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold">{fromCurrency}</div>
            <ArrowRight className="h-5 w-5 text-gray-500" />
            <div className="text-xl font-bold">{toCurrency}</div>
          </div>
          
          {exchangeRate ? (
            <>
              <div className="text-sm text-gray-500">
                Last updated: {formatDate(exchangeRate.updatedAt, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor={`rate-${fromCurrency}-${toCurrency}`}>Exchange Rate</Label>
                <div className="flex gap-2">
                  <Input
                    id={`rate-${fromCurrency}-${toCurrency}`}
                    type="number"
                    step="0.0001"
                    min="0"
                    value={editRate !== undefined ? editRate : ''}
                    onChange={(e) => onRateChange(e.target.value)}
                    placeholder="Enter exchange rate"
                    disabled={isLoading}
                  />
                  <Button onClick={onSave} disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
              
              {exchangeRate.rate ? (
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium">Current Rate: <span className="font-bold">{exchangeRate.rate}</span></p>
                  <p className="text-sm text-gray-600">1 {fromCurrency} = {exchangeRate.rate} {toCurrency}</p>
                </div>
              ) : (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-blue-900">No rate set yet</p>
                  <p className="text-sm text-blue-700">Enter a rate above and click Save to create it</p>
                </div>
              )}
            </>
          ) : isLoading ? (
            <div className="py-4 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-900">No rate set yet</p>
                <p className="text-sm text-blue-700">Enter a rate below and click Save to create it</p>
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor={`rate-${fromCurrency}-${toCurrency}`}>Exchange Rate</Label>
                <div className="flex gap-2">
                  <Input
                    id={`rate-${fromCurrency}-${toCurrency}`}
                    type="number"
                    step="0.0001"
                    min="0"
                    value={editRate !== undefined ? editRate : ''}
                    onChange={(e) => onRateChange(e.target.value)}
                    placeholder="Enter exchange rate (e.g., 4.30)"
                    disabled={isLoading}
                  />
                  <Button onClick={onSave} disabled={isLoading || !editRate || editRate <= 0}>
                    <Save className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
