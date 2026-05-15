import { TrendingUp, DollarSign, Waves } from 'lucide-react';
import React from 'react';

export const ASSETS = [
  { id: 'sp500', name: 'S&P 500', icon: React.createElement(TrendingUp, { className: "w-4 h-4" }) },
  { id: 'gold', name: 'Gold', icon: React.createElement(DollarSign, { className: "w-4 h-4" }) },
  { id: 'treasury_10y', name: 'US Bonds', icon: React.createElement(Waves, { className: "w-4 h-4" }) },
];

export const STRATEGIES = [
  { id: 'lump-sum', name: 'Lump Sum' },
  { id: 'monthly-dca', name: 'Monthly DCA' },
  { id: 'weekly-dca', name: 'Weekly DCA' },
  { id: 'dip-buy', name: 'Dip Buy (-5%)' },
];

export const API_BASE_URL = 'http://localhost:8000/api';
