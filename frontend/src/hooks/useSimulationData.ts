import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export interface SimulationResult {
  id: number;
  strategy_name: string;
  asset_id: string;
  run_date: string;
  start_date: string;
  end_date: string;
  initial_cash: number;
  total_return: number;
  cagr: number;
  sharpe_ratio: number | null;
  sortino_ratio: number | null;
  max_drawdown: number;
  real_total_return: number | null;
  real_cagr: number | null;
}

export interface DailyPerformance {
  id: number;
  simulation_id: number;
  date: string;
  cash_balance: number;
  asset_units: number;
  asset_price: number;
  portfolio_value: number;
  daily_return: number;
  cumulative_return: number;
}

export const useSimulationData = (strategyName: string, assetId: string) => {
  // Fetch all simulations to find the correct one
  const simulationsQuery = useQuery<SimulationResult[]>({
    queryKey: ['simulations'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/simulations`);
      return response.data;
    },
  });

  const selectedSimulation = simulationsQuery.data?.find(
    (sim) => sim.strategy_name === strategyName && sim.asset_id === assetId
  );

  const simulationId = selectedSimulation?.id;

  const performanceQuery = useQuery<DailyPerformance[]>({
    queryKey: ['performance', simulationId],
    queryFn: async () => {
      if (!simulationId) return [];
      const response = await axios.get(`${API_BASE_URL}/simulations/${simulationId}/performance`);
      return response.data;
    },
    enabled: !!simulationId,
  });

  return {
    simulation: selectedSimulation,
    performance: performanceQuery.data || [],
    isLoading: simulationsQuery.isLoading || performanceQuery.isLoading,
    isError: simulationsQuery.isError || performanceQuery.isError,
    refetch: async () => {
      await simulationsQuery.refetch();
      if (simulationId) {
        await performanceQuery.refetch();
      }
    },
  };
};
