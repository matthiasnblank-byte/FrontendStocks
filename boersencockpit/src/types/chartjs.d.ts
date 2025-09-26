/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */

declare module 'chart.js' {
  export type ChartConfiguration<TType extends string = string> = any;
  export type ChartDataset<TType extends string = string, TData = unknown> = any;
  export type ChartOptions<TType extends string = string> = any;
  export class Chart<TType extends string = string, TData = unknown> {
    constructor(...args: any[]);
    static register(...args: unknown[]): void;
  }
  export const registerables: unknown[];
}

declare module 'chartjs-plugin-annotation' {
  export type AnnotationOptions = any;
}

