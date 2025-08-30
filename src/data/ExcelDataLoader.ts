// Returns all stats for a country for a given year (default: latest year in data)
export function getCountryStats(allIndicators: AllIndicators, country: string, year?: string | number): Record<string, number | null> {
  const stats: Record<string, number | null> = {};
  for (const indicator of Object.keys(allIndicators)) {
    const indicatorData = allIndicators[indicator][country];
    if (indicatorData) {
      let y = year;
      if (!y) {
        // Use latest year available
        const years = Object.keys(indicatorData).sort();
        y = years[years.length - 1];
      }
      stats[indicator] = indicatorData[y] ?? null;
    } else {
      stats[indicator] = null;
    }
  }
  return stats;
}

// Returns all stats for all countries for a given year (default: latest year in data)
export function getAllCountriesStats(allIndicators: AllIndicators, year?: string | number): Record<string, Record<string, number | null>> {
  const allStats: Record<string, Record<string, number | null>> = {};
  for (const countryObj of SOUTH_ASIAN_COUNTRIES) {
    allStats[countryObj.name] = getCountryStats(allIndicators, countryObj.name, year);
  }
  return allStats;
}
import * as XLSX from 'xlsx';
// import { Country } from '../types/GameTypes'; // Not needed
import { SOUTH_ASIAN_COUNTRIES } from './CountryList';

export interface IndicatorData {
  [country: string]: {
    [year: string]: number;
  };
}

export interface AllIndicators {
  [indicator: string]: IndicatorData;
}

export async function loadAllExcelIndicators(): Promise<AllIndicators> {
  const indicatorFiles = [
    'WDI_GDP.xlsx',
    'WDI_Unemployment.xlsx',
    'WDI_Literacy.xlsx',
    'WDI_Health.xlsx',
    'WDI_Poverty.xlsx',
    'WDI_CO2_Emissions.xlsx',
    'WDI_Population.xlsx',
    'WDI_MortalityRate.xlsx',
    'WDI_Education.xlsx',
    'WDI_Infrastructure.xlsx',
    'WDI_RenewableEnergy.xlsx',
    'WDI_Gini.xlsx',
    'WDI_Inflation.xlsx',
    'WDI_Internet.xlsx',
    'WDI_Agriculture.xlsx',
    'WDI_Manufacturing.xlsx',
    'WDI_Industry.xlsx',
    'WDI_Services.xlsx',
    'WDI_Finance.xlsx',
    'WDI_TradeIndex.xlsx',
    'WDI_UrbanPopulationGrowth.xlsx'
  ];
  const allIndicators: AllIndicators = {};

  for (const file of indicatorFiles) {
    const response = await fetch(`/src/data/${file}`);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    // Assume first row is header: [Country, Year, Value]
    const indicatorName = file.replace('WDI_', '').replace('.xlsx', '');
    allIndicators[indicatorName] = {};
    for (let i = 1; i < json.length; i++) {
      const row = json[i] as [string, string | number, number];
      const country = row[0];
      const year = row[1];
      const value = row[2];
      if (!allIndicators[indicatorName][country]) allIndicators[indicatorName][country] = {};
      allIndicators[indicatorName][country][year] = value;
    }
  }
  return allIndicators;
}

// Utility to get a country's indicator for a year
export function getIndicatorValue(
  allIndicators: AllIndicators,
  indicator: string,
  country: string,
  year: string | number
): number | null {
  const ind = allIndicators[indicator];
  if (!ind) return null;
  const c = ind[country];
  if (!c) return null;
  return c[year] ?? null;
}
