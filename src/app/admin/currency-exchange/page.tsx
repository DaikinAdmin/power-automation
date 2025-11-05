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
import { Currency } from '@prisma/client';
import { formatDate } from '@/helpers/formatting';

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
          fromCurrency={Currency.EUR}
          toCurrency={Currency.PLN}
          exchangeRate={getCurrencyPair(Currency.EUR, Currency.PLN)}
          editRate={editRates[`${Currency.EUR}_${Currency.PLN}`]}
          onRateChange={(value) => handleRateChange(Currency.EUR, Currency.PLN, value)}
          onSave={() => updateExchangeRate(Currency.EUR, Currency.PLN)}
          isLoading={isLoading}
        />
        
        {/* EUR to UAH */}
        <CurrencyExchangeCard
          title="EUR to UAH"
          description="Euro to Ukrainian Hryvnia exchange rate"
          fromCurrency={Currency.EUR}
          toCurrency={Currency.UAH}
          exchangeRate={getCurrencyPair(Currency.EUR, Currency.UAH)}
          editRate={editRates[`${Currency.EUR}_${Currency.UAH}`]}
          onRateChange={(value) => handleRateChange(Currency.EUR, Currency.UAH, value)}
          onSave={() => updateExchangeRate(Currency.EUR, Currency.UAH)}
          isLoading={isLoading}
        />
        
        {/* PLN to EUR */}
        <CurrencyExchangeCard
          title="PLN to EUR"
          description="Polish Złoty to Euro exchange rate"
          fromCurrency={Currency.PLN}
          toCurrency={Currency.EUR}
          exchangeRate={getCurrencyPair(Currency.PLN, Currency.EUR)}
          editRate={editRates[`${Currency.PLN}_${Currency.EUR}`]}
          onRateChange={(value) => handleRateChange(Currency.PLN, Currency.EUR, value)}
          onSave={() => updateExchangeRate(Currency.PLN, Currency.EUR)}
          isLoading={isLoading}
        />
        
        {/* UAH to EUR */}
        <CurrencyExchangeCard
          title="UAH to EUR"
          description="Ukrainian Hryvnia to Euro exchange rate"
          fromCurrency={Currency.UAH}
          toCurrency={Currency.EUR}
          exchangeRate={getCurrencyPair(Currency.UAH, Currency.EUR)}
          editRate={editRates[`${Currency.UAH}_${Currency.EUR}`]}
          onRateChange={(value) => handleRateChange(Currency.UAH, Currency.EUR, value)}
          onSave={() => updateExchangeRate(Currency.UAH, Currency.EUR)}
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
              
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium">Current Rate: <span className="font-bold">{exchangeRate.rate}</span></p>
                <p className="text-sm text-gray-600">1 {fromCurrency} = {exchangeRate.rate} {toCurrency}</p>
              </div>
            </>
          ) : isLoading ? (
            <div className="py-4 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="py-4 text-center text-gray-500">Exchange rate not found</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
