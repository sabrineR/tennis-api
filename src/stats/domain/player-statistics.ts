export interface PlayerStatistics {
  bestCountry: { code: string; winRatio: number } | null;
  averageBmi: number | null;
  medianHeightCm: number | null;
}
