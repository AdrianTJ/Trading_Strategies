import pandas as pd
import numpy as np
from typing import Dict, Any

class Simulator:
    def __init__(
        self, 
        initial_cash: float = 10000.0, 
        commission: float = 1.00, 
        slippage: float = 0.0005
    ):
        self.initial_cash = initial_cash
        self.commission = commission
        self.slippage = slippage

    def run(self, df: pd.DataFrame, signals: pd.Series, invest_amount: float = None) -> pd.DataFrame:
        """
        Run simulation based on signals.
        - df must have 'close' price.
        - signals is a boolean mask (1 for buy, 0 for hold).
        - invest_amount: if None, invest all available cash on signal.
        """
        results = df.copy()
        results['signal'] = signals
        
        # Enforce Next Day Open Execution
        # We shift the signals by 1 day so that a signal at date T
        # is executed at date T+1 price.
        results['execute_buy'] = results['signal'].shift(1).fillna(0)
        
        cash = self.initial_cash
        units = 0.0
        
        cash_balance = []
        asset_units = []
        portfolio_value = []
        
        for date, row in results.iterrows():
            price = row['close']
            
            if row['execute_buy'] == 1:
                # Determine how much to invest
                amount_to_spend = invest_amount if invest_amount else cash
                
                if amount_to_spend > self.commission:
                    # Apply slippage to execution price
                    exec_price = price * (1 + self.slippage)
                    
                    # Calculate units bought after commission
                    net_investment = amount_to_spend - self.commission
                    new_units = net_investment / exec_price
                    
                    units += new_units
                    cash -= amount_to_spend
            
            current_value = cash + (units * price)
            
            cash_balance.append(cash)
            asset_units.append(units)
            portfolio_value.append(current_value)
            
        results['cash_balance'] = cash_balance
        results['asset_units'] = asset_units
        results['portfolio_value'] = portfolio_value
        results['daily_return'] = results['portfolio_value'].pct_change().fillna(0)
        results['cumulative_return'] = (results['portfolio_value'] / self.initial_cash) - 1
        
        return results
