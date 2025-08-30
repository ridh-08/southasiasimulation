import tradeProductsData from './BilateralTradeProducts.json';

export interface TradeProductsData {
  imports: {
    [country: string]: {
      [partner: string]: string[];
    };
  };
  exports: {
    [country: string]: {
      [partner: string]: string[];
    };
  };
}

export const BILATERAL_TRADE_PRODUCTS: TradeProductsData = tradeProductsData;

export function getImportProducts(importer: string, exporter: string): string[] {
  return BILATERAL_TRADE_PRODUCTS.imports[importer]?.[exporter] || [];
}

export function getExportProducts(exporter: string, importer: string): string[] {
  return BILATERAL_TRADE_PRODUCTS.exports[exporter]?.[importer] || [];
}

export function getAllTradingPartners(country: string): string[] {
  const partners = new Set<string>();
  
  // Add import partners
  if (BILATERAL_TRADE_PRODUCTS.imports[country]) {
    Object.keys(BILATERAL_TRADE_PRODUCTS.imports[country]).forEach(partner => {
      partners.add(partner);
    });
  }
  
  // Add export partners
  if (BILATERAL_TRADE_PRODUCTS.exports[country]) {
    Object.keys(BILATERAL_TRADE_PRODUCTS.exports[country]).forEach(partner => {
      partners.add(partner);
    });
  }
  
  return Array.from(partners);
}

export function getTradeIntensity(country1: string, country2: string): number {
  const imports = getImportProducts(country1, country2);
  const exports = getExportProducts(country1, country2);
  
  // Simple intensity calculation based on number of traded products
  const totalProducts = imports.length + exports.length;
  return Math.min(100, totalProducts * 5); // Scale to 0-100
}

export function getMainTradeProducts(country1: string, country2: string): {
  imports: string[];
  exports: string[];
  total: string[];
} {
  const imports = getImportProducts(country1, country2);
  const exports = getExportProducts(country1, country2);
  const total = [...new Set([...imports, ...exports])];
  
  return { imports, exports, total };
}