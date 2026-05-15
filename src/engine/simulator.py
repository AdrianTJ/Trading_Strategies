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
        - invest_amount: if provided, this amount is ADDED and invested on signal. 
                        If None, all current cash is invested on signal.
        """
        results = df.copy()
        results['signal'] = signals
        
        # Enforce Next Day Open Execution
        results['execute_buy'] = results['signal'].shift(1).fillna(0)
        
        cash = self.initial_cash
        units = 0.0
        total_invested = self.initial_cash
        
        cash_balance = []
        asset_units = []
        portfolio_value = []
        total_invested_list = []
        
        for date, row in results.iterrows():
            price = row['close']
            
            if row['execute_buy'] == 1:
                if invest_amount:
                    # DCA: Add new capital and invest it
                    total_invested += invest_amount
                    # For simplicity, we assume we buy at the current price
                    # and the cash is added specifically for this purchase.
                    exec_price = price * (1 + self.slippage)
                    net_investment = invest_amount - self.commission
                    if net_investment > 0:
                        new_units = net_investment / exec_price
                        units += new_units
                else:
                    # Lump sum: Invest all available cash
                    if cash > self.commission:
                        exec_price = price * (1 + self.slippage)
                        net_investment = cash - self.commission
                        new_units = net_investment / exec_price
                        units += new_units
                        cash = 0 # All cash spent
            
            current_value = cash + (units * price)
            
            cash_balance.append(cash)
            asset_units.append(units)
            portfolio_value.append(current_value)
            total_invested_list.append(total_invested)
            
        daily_returns = [0.0]
        for i in range(1, len(portfolio_value)):
            prev_val = portfolio_value[i-1]
            curr_val = portfolio_value[i]
            
            # If capital was added on this day (execute_buy == 1 and invest_amount provided)
            # we need to subtract it from curr_val to get the organic return
            capital_added = 0
            if results.iloc[i]['execute_buy'] == 1 and invest_amount:
                capital_added = invest_amount
            
            if prev_val > 0:
                daily_ret = (curr_val - capital_added) / prev_val - 1
            else:
                daily_ret = 0.0
            daily_returns.append(daily_ret)

        results['cash_balance'] = cash_balance
        results['asset_units'] = asset_units
        results['portfolio_value'] = portfolio_value
        results['total_invested'] = total_invested_list
        results['daily_return'] = daily_returns
        results['cumulative_return'] = (results['portfolio_value'] / results['total_invested']) - 1
        
        return results
