export type Symbol = string & { readonly __brand: 'Symbol' };

export const asSymbol = (value: string): Symbol => value as Symbol;
