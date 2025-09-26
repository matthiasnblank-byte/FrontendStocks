export interface PortfolioSnapshot {
  readonly asOf: string;
  readonly totalValue: number;
  readonly invested: number;
  readonly pnlAbs: number;
  readonly pnlPct: number;
}
