import { TradeRelationship, RegionalMatrix, PolicySpillover } from '../types/GameTypes';
import { SOUTH_ASIAN_COUNTRIES } from './CountryList';
import { BILATERAL_TRADE_PRODUCTS, getMainTradeProducts, getTradeIntensity } from './TradeProductsLoader';

// Trade relationships based on real South Asian trade patterns
export const INITIAL_TRADE_MATRIX: TradeRelationship[] = [
  // India's trade relationships (largest economy, major trading partner)
  { from: 'India', to: 'Bangladesh', tradeVolume: 8.5, tariffRate: 8.5, cooperation: 75 },
  { from: 'India', to: 'Pakistan', tradeVolume: 2.1, tariffRate: 25.0, cooperation: 35 },
  { from: 'India', to: 'Sri Lanka', tradeVolume: 4.7, tariffRate: 12.0, cooperation: 80 },
  { from: 'India', to: 'Nepal', tradeVolume: 6.8, tariffRate: 5.0, cooperation: 85 },
  { from: 'India', to: 'Bhutan', tradeVolume: 12.5, tariffRate: 0.0, cooperation: 95 },
  { from: 'India', to: 'Maldives', tradeVolume: 4.2, tariffRate: 10.0, cooperation: 70 },
  { from: 'India', to: 'Afghanistan', tradeVolume: 1.5, tariffRate: 15.0, cooperation: 45 },

  // Bangladesh trade relationships
  { from: 'Bangladesh', to: 'India', tradeVolume: 1.2, tariffRate: 12.0, cooperation: 75 },
  { from: 'Bangladesh', to: 'Pakistan', tradeVolume: 0.2, tariffRate: 20.0, cooperation: 60 },
  { from: 'Bangladesh', to: 'Sri Lanka', tradeVolume: 0.05, tariffRate: 15.0, cooperation: 65 },
  { from: 'Bangladesh', to: 'Nepal', tradeVolume: 0.03, tariffRate: 18.0, cooperation: 70 },

  // Pakistan trade relationships
  { from: 'Pakistan', to: 'India', tradeVolume: 0.4, tariffRate: 30.0, cooperation: 35 },
  { from: 'Pakistan', to: 'Bangladesh', tradeVolume: 0.1, tariffRate: 18.0, cooperation: 60 },
  { from: 'Pakistan', to: 'Sri Lanka', tradeVolume: 0.3, tariffRate: 12.0, cooperation: 70 },
  { from: 'Pakistan', to: 'Afghanistan', tradeVolume: 1.8, tariffRate: 8.0, cooperation: 80 },

  // Other bilateral relationships
  { from: 'Sri Lanka', to: 'India', tradeVolume: 1.1, tariffRate: 10.0, cooperation: 80 },
  { from: 'Sri Lanka', to: 'Pakistan', tradeVolume: 0.2, tariffRate: 14.0, cooperation: 70 },
  { from: 'Nepal', to: 'India', tradeVolume: 0.7, tariffRate: 3.0, cooperation: 85 },
  { from: 'Bhutan', to: 'India', tradeVolume: 0.4, tariffRate: 0.0, cooperation: 95 },
  { from: 'Maldives', to: 'India', tradeVolume: 0.02, tariffRate: 8.0, cooperation: 70 },
  { from: 'Afghanistan', to: 'Pakistan', tradeVolume: 0.3, tariffRate: 10.0, cooperation: 80 },
  { from: 'Afghanistan', to: 'India', tradeVolume: 0.1, tariffRate: 18.0, cooperation: 45 }
];

export const INITIAL_REGIONAL_MATRIX: RegionalMatrix = {
  countries: SOUTH_ASIAN_COUNTRIES.map(c => c.name),
  tradeMatrix: INITIAL_TRADE_MATRIX,
  regionalEvents: [],
  cooperationIndex: 65 // Overall SAARC cooperation index
};

export class RegionalEconomySimulator {
  static calculateTradeSpillovers(
    sourceCountry: string,
    policyChanges: { [key: string]: number },
    tradeMatrix: TradeRelationship[]
  ): PolicySpillover[] {
    const spillovers: PolicySpillover[] = [];

    // Find all countries that trade with the source country
    const tradingPartners = tradeMatrix.filter(t => 
      t.from === sourceCountry || t.to === sourceCountry
    );

    tradingPartners.forEach(trade => {
      const targetCountry = trade.from === sourceCountry ? trade.to : trade.from;
      const tradeIntensity = trade.tradeVolume / 100; // Convert to decimal
      const cooperationFactor = trade.cooperation / 100;

      // GDP Growth spillovers
      if (policyChanges.gdp_growth) {
        const spilloverEffect = policyChanges.gdp_growth * tradeIntensity * cooperationFactor * 0.25;
        spillovers.push({
          sourceCountry,
          targetCountry,
          policyType: 'trade_gdp',
          effect: spilloverEffect,
          description: `Trade spillover from ${sourceCountry}'s economic growth`,
          magnitude: spilloverEffect > 0.1 ? 'high' : spilloverEffect > 0.05 ? 'medium' : 'low',
          timeframe: 'short-term'
        });
      }

      // Infrastructure spillovers (cross-border connectivity)
      if (policyChanges.infrastructure_investment) {
        const infraSpillover = (policyChanges.infrastructure_investment - 5) * tradeIntensity * 0.12;
        spillovers.push({
          sourceCountry,
          targetCountry,
          policyType: 'infrastructure',
          effect: infraSpillover,
          description: `Cross-border infrastructure benefits from ${sourceCountry}`,
          magnitude: Math.abs(infraSpillover) > 0.08 ? 'high' : Math.abs(infraSpillover) > 0.04 ? 'medium' : 'low',
          timeframe: 'medium-term'
        });
      }

      // Environmental spillovers (pollution, climate)
      if (policyChanges.co2_emissions) {
        const envSpillover = policyChanges.co2_emissions * 0.08; // Cross-border pollution
        spillovers.push({
          sourceCountry,
          targetCountry,
          policyType: 'environment',
          effect: envSpillover,
          description: `Environmental impact from ${sourceCountry}'s emissions`,
          magnitude: Math.abs(envSpillover) > 0.05 ? 'high' : Math.abs(envSpillover) > 0.02 ? 'medium' : 'low',
          timeframe: 'long-term'
        });
      }

      // Industry-specific spillovers
      if (policyChanges.manufacturing_investment) {
        const manufacturingSpillover = policyChanges.manufacturing_investment * tradeIntensity * 0.1;
        spillovers.push({
          sourceCountry,
          targetCountry,
          policyType: 'manufacturing',
          effect: manufacturingSpillover,
          description: `Manufacturing competitiveness impact from ${sourceCountry}`,
          magnitude: Math.abs(manufacturingSpillover) > 0.06 ? 'high' : Math.abs(manufacturingSpillover) > 0.03 ? 'medium' : 'low',
          timeframe: 'medium-term',
          sector: 'manufacturing'
        });
      }

      // Technology spillovers
      if (policyChanges.technology_investment) {
        const techSpillover = policyChanges.technology_investment * cooperationFactor * 0.15;
        spillovers.push({
          sourceCountry,
          targetCountry,
          policyType: 'technology',
          effect: techSpillover,
          description: `Technology transfer and innovation spillover from ${sourceCountry}`,
          magnitude: Math.abs(techSpillover) > 0.08 ? 'high' : Math.abs(techSpillover) > 0.04 ? 'medium' : 'low',
          timeframe: 'long-term',
          sector: 'technology'
        });
      }

      // Energy spillovers (especially relevant for cross-border energy trade)
      if (policyChanges.energy_investment && this.hasEnergyTrade(sourceCountry, targetCountry)) {
        const energySpillover = policyChanges.energy_investment * 0.2;
        spillovers.push({
          sourceCountry,
          targetCountry,
          policyType: 'energy',
          effect: energySpillover,
          description: `Energy security and pricing impact from ${sourceCountry}`,
          magnitude: Math.abs(energySpillover) > 0.1 ? 'high' : Math.abs(energySpillover) > 0.05 ? 'medium' : 'low',
          timeframe: 'immediate',
          sector: 'energy'
        });
      }
    });

    return spillovers;
  }

  static hasEnergyTrade(country1: string, country2: string): boolean {
    // Countries with significant energy trade relationships
    const energyTradePairs = [
      ['India', 'Bhutan'], // Hydroelectric power
      ['India', 'Nepal'], // Power trade
      ['Pakistan', 'Afghanistan'], // Energy cooperation
      ['India', 'Bangladesh'] // Power grid connectivity
    ];
    
    return energyTradePairs.some(pair => 
      (pair[0] === country1 && pair[1] === country2) ||
      (pair[0] === country2 && pair[1] === country1)
    );
  }

  static calculateDetailedSpillovers(
    sourceCountry: string,
    policyChanges: { [key: string]: number },
    tradeMatrix: TradeRelationship[],
    tradeProductsData: any
  ): any[] {
    const detailedSpillovers: any[] = [];
    
    // Get actual trading partners and trade volumes
    const tradingPartners = tradeMatrix.filter(t => 
      t.from === sourceCountry || t.to === sourceCountry
    );

    tradingPartners.forEach(trade => {
      const targetCountry = trade.from === sourceCountry ? trade.to : trade.from;
      const tradeVolume = trade.tradeVolume;
      
      // Calculate specific product-based spillovers using bilateral trade products
      const tradeProducts = getMainTradeProducts(sourceCountry, targetCountry);
      
      if (tradeProducts.total.length > 0) {
        tradeProducts.total.forEach((product: string) => {
          if (this.isPolicyRelevantToProduct(policyChanges, product)) {
            const magnitude = this.calculateProductSpillover(policyChanges, product, tradeVolume);
            
            if (Math.abs(magnitude) > 0.01) { // Only include significant spillovers
              detailedSpillovers.push({
                id: `${sourceCountry}-${targetCountry}-${product}`,
                sourceCountry,
                targetCountry,
                policyCategory: this.getPolicyCategory(policyChanges, product),
                effectType: this.getEffectType(product),
                magnitude: magnitude,
                description: `${product} trade impact from ${sourceCountry} to ${targetCountry}`,
                tradeProducts: [product],
                timeframe: this.getSpilloverTimeframe(product),
                confidence: 0.8,
                sector: this.getProductSector(product)
              });
            }
          }
        });
      }
      
      // Add general policy spillovers
      Object.entries(policyChanges).forEach(([policyType, change]) => {
        if (Math.abs(change) > 0.1) {
          const magnitude = this.calculateGeneralSpillover(policyType, change, tradeVolume);
          
          if (Math.abs(magnitude) > 0.01) {
            detailedSpillovers.push({
              id: `${sourceCountry}-${targetCountry}-${policyType}`,
              sourceCountry,
              targetCountry,
              policyCategory: policyType,
              effectType: this.getPolicyEffectType(policyType),
              magnitude: magnitude,
              description: `${policyType} policy impact from ${sourceCountry} to ${targetCountry}`,
              timeframe: this.getPolicyTimeframe(policyType),
              confidence: 0.7
            });
          }
        }
      });
    });

    return detailedSpillovers;
  }

  static getEffectType(product: string): 'trade' | 'investment' | 'technology' | 'environment' {
    const techProducts = ['machinery', 'pharmaceuticals', 'chemicals', 'electronics'];
    const envProducts = ['petroleum', 'coal', 'natural gas', 'timber'];
    
    if (techProducts.some(tp => product.toLowerCase().includes(tp))) return 'technology';
    if (envProducts.some(ep => product.toLowerCase().includes(ep))) return 'environment';
    return 'trade';
  }

  static getProductSector(product: string): string {
    const productSectorMap: { [key: string]: string } = {
      'textiles': 'manufacturing',
      'pharmaceuticals': 'health',
      'machinery': 'manufacturing',
      'food': 'agriculture',
      'petroleum': 'energy',
      'electricity': 'energy',
      'tea': 'agriculture',
      'rice': 'agriculture',
      'cotton': 'agriculture',
      'cement': 'manufacturing',
      'chemicals': 'manufacturing',
      'fish': 'agriculture',
      'timber': 'environment',
      'gems': 'mining',
      'handicrafts': 'services'
    };
    
    const lowerProduct = product.toLowerCase();
    for (const [key, sector] of Object.entries(productSectorMap)) {
      if (lowerProduct.includes(key)) {
        return sector;
      }
    }
    return 'trade';
  }

  static calculateGeneralSpillover(policyType: string, change: number, tradeVolume: number): number {
    const baseEffect = (tradeVolume / 100) * (change / 10);
    
    switch (policyType) {
      case 'infrastructure':
        return baseEffect * 0.15; // Infrastructure has strong spillovers
      case 'education':
        return baseEffect * 0.08; // Education has medium spillovers
      case 'health':
        return baseEffect * 0.06; // Health has moderate spillovers
      case 'trade':
        return baseEffect * 0.20; // Trade policy has high spillovers
      case 'environment':
        return baseEffect * 0.12; // Environmental policies have cross-border effects
      default:
        return baseEffect * 0.05;
    }
  }

  static getPolicyEffectType(policyType: string): 'trade' | 'investment' | 'technology' | 'environment' {
    switch (policyType) {
      case 'trade':
      case 'tariff':
        return 'trade';
      case 'infrastructure':
      case 'foreign_investment':
        return 'investment';
      case 'technology':
        return 'technology';
      case 'environment':
        return 'environment';
      default:
        return 'trade';
    }
  }

  static getPolicyTimeframe(policyType: string): 'immediate' | 'short-term' | 'medium-term' | 'long-term' {
    switch (policyType) {
      case 'tariff':
      case 'trade':
        return 'immediate';
      case 'infrastructure':
      case 'health':
        return 'medium-term';
      case 'education':
      case 'technology':
        return 'long-term';
      default:
        return 'short-term';
    }
  }

  static isPolicyRelevantToProduct(policyChanges: { [key: string]: number }, product: string): boolean {
    const productPolicyMap: { [key: string]: string[] } = {
      'textiles': ['manufacturing', 'trade', 'labor_market', 'services'],
      'pharmaceuticals': ['health', 'manufacturing', 'technology'],
      'machinery': ['manufacturing', 'technology', 'infrastructure', 'industry'],
      'food': ['agriculture', 'trade'],
      'rice': ['agriculture', 'trade'],
      'tea': ['agriculture', 'trade'],
      'cotton': ['agriculture', 'manufacturing'],
      'petroleum': ['energy', 'trade'],
      'electricity': ['energy', 'infrastructure'],
      'cement': ['manufacturing', 'infrastructure'],
      'chemicals': ['manufacturing', 'health'],
      'fish': ['agriculture', 'trade'],
      'timber': ['environment', 'trade'],
      'gems': ['trade', 'services'],
      'handicrafts': ['services', 'tourism'],
      'jute': ['agriculture', 'manufacturing'],
      'leather': ['manufacturing', 'trade'],
      'spices': ['agriculture', 'trade'],
      'rubber': ['agriculture', 'manufacturing'],
      'coconut': ['agriculture', 'trade']
    };
    
    const lowerProduct = product.toLowerCase();
    let relevantPolicies: string[] = [];
    
    for (const [key, policies] of Object.entries(productPolicyMap)) {
      if (lowerProduct.includes(key)) {
        relevantPolicies = [...relevantPolicies, ...policies];
      }
    }
    
    return relevantPolicies.some(policy => policy in policyChanges);
  }

  static getPolicyCategory(policyChanges: { [key: string]: number }, product: string): string {
    const lowerProduct = product.toLowerCase();
    const productPolicyMap: { [key: string]: string } = {
      'textiles': 'manufacturing',
      'pharmaceuticals': 'health',
      'machinery': 'manufacturing',
      'food': 'agriculture',
      'rice': 'agriculture',
      'tea': 'agriculture',
      'cotton': 'agriculture',
      'petroleum': 'energy',
      'electricity': 'energy',
      'cement': 'manufacturing',
      'chemicals': 'manufacturing',
      'fish': 'agriculture',
      'timber': 'environment',
      'gems': 'services',
      'handicrafts': 'services',
      'jute': 'agriculture',
      'leather': 'manufacturing',
      'spices': 'agriculture',
      'rubber': 'agriculture',
      'coconut': 'agriculture'
    };
    
    for (const [key, category] of Object.entries(productPolicyMap)) {
      if (lowerProduct.includes(key)) {
        return category;
      }
    }
    
    return 'trade';
  }

  static calculateProductSpillover(policyChanges: { [key: string]: number }, product: string, tradeVolume: number): number {
    // Product-specific spillover calculations
    const baseEffect = tradeVolume / 100;
    const lowerProduct = product.toLowerCase();
    
    // Check for product categories and calculate spillovers
    if (lowerProduct.includes('textile') || lowerProduct.includes('cotton') || lowerProduct.includes('garment')) {
      return ((policyChanges.manufacturing || 0) + (policyChanges.services || 0)) * baseEffect * 0.3;
    }
    if (lowerProduct.includes('pharmaceutical') || lowerProduct.includes('chemical')) {
      return ((policyChanges.health || 0) + (policyChanges.manufacturing || 0)) * baseEffect * 0.4;
    }
    if (lowerProduct.includes('machinery') || lowerProduct.includes('equipment')) {
      return ((policyChanges.infrastructure || 0) + (policyChanges.technology || 0)) * baseEffect * 0.35;
    }
    if (lowerProduct.includes('food') || lowerProduct.includes('rice') || lowerProduct.includes('tea') || 
        lowerProduct.includes('fish') || lowerProduct.includes('spice')) {
      return (policyChanges.agriculture || 0) * baseEffect * 0.25;
    }
    if (lowerProduct.includes('petroleum') || lowerProduct.includes('electricity') || 
        lowerProduct.includes('gas') || lowerProduct.includes('energy')) {
      return (policyChanges.energy || 0) * baseEffect * 0.5;
    }
    if (lowerProduct.includes('handicraft') || lowerProduct.includes('tourism') || lowerProduct.includes('gem')) {
      return ((policyChanges.tourism || 0) + (policyChanges.services || 0)) * baseEffect * 0.3;
    }
    if (lowerProduct.includes('cement') || lowerProduct.includes('construction')) {
      return (policyChanges.infrastructure || 0) * baseEffect * 0.4;
    }
    
    // Default trade spillover
    return (policyChanges.trade || 0) * baseEffect * 0.2;
  }

  static getSpilloverTimeframe(product: string): 'immediate' | 'short-term' | 'medium-term' | 'long-term' {
    const lowerProduct = product.toLowerCase();
    const immediateProducts = ['petroleum', 'electricity', 'food', 'gas', 'energy'];
    const shortTermProducts = ['textiles', 'machinery', 'cement', 'rice', 'fish'];
    const mediumTermProducts = ['pharmaceuticals', 'chemicals', 'equipment'];
    const longTermProducts = ['technology', 'education', 'infrastructure'];
    
    if (immediateProducts.some(p => lowerProduct.includes(p))) return 'immediate';
    if (shortTermProducts.some(p => lowerProduct.includes(p))) return 'short-term';
    if (mediumTermProducts.some(p => lowerProduct.includes(p))) return 'medium-term';
    if (longTermProducts.some(p => lowerProduct.includes(p))) return 'long-term';
    return 'long-term';
  }

  static calculateTariffEffects(
    country: string,
    tariffPolicy: number, // 0-100 scale
    tradeMatrix: TradeRelationship[]
  ): { [key: string]: number } {
    const effects: { [key: string]: number } = {
      gdp_growth: 0,
      unemployment: 0,
      poverty_rate: 0
    };

    const countryTrades = tradeMatrix.filter(t => t.from === country || t.to === country);
    const avgTradeVolume = countryTrades.reduce((sum, t) => sum + t.tradeVolume, 0) / countryTrades.length;

    // High tariffs reduce trade but may protect domestic industry short-term
    if (tariffPolicy > 50) {
      effects.gdp_growth -= (tariffPolicy - 50) * 0.02 * (avgTradeVolume / 100);
      effects.unemployment += (tariffPolicy - 50) * 0.01;
    } else {
      // Low tariffs boost trade and efficiency
      effects.gdp_growth += (50 - tariffPolicy) * 0.015 * (avgTradeVolume / 100);
      effects.unemployment -= (50 - tariffPolicy) * 0.008;
    }

    return effects;
  }

  static simulateRegionalCooperation(
    cooperationLevel: number, // 0-100
    allCountries: { [key: string]: any }
  ): { [key: string]: { [key: string]: number } } {
    const cooperationEffects: { [key: string]: { [key: string]: number } } = {};

    Object.keys(allCountries).forEach(country => {
      cooperationEffects[country] = {};

      // High cooperation benefits
      if (cooperationLevel > 70) {
        cooperationEffects[country].gdp_growth = 0.3;
        cooperationEffects[country].infrastructure_investment = 0.5;
        cooperationEffects[country].trade_volume = 0.2;
      } else if (cooperationLevel < 40) {
        // Low cooperation penalties
        cooperationEffects[country].gdp_growth = -0.2;
        cooperationEffects[country].unemployment = 0.3;
      }
    });

    return cooperationEffects;
  }

  static generateRegionalEvents(year: number, cooperationIndex: number): any[] {
    const events = [];
    const eventProbability = Math.random();

    // SAARC Summit (every 3 years)
    if (year % 3 === 0 && eventProbability < 0.7) {
      events.push({
        id: 'saarc_summit',
        name: 'SAARC Summit',
        description: 'Regional leaders meet to discuss cooperation and trade agreements',
        year,
        effects: {
          cooperation_boost: cooperationIndex > 60 ? 5 : 2,
          trade_volume_increase: 0.1
        }
      });
    }

    // Regional Trade Dispute
    if (eventProbability < 0.15) {
      events.push({
        id: 'trade_dispute',
        name: 'Regional Trade Dispute',
        description: 'Tensions arise over trade policies, affecting regional cooperation',
        year,
        effects: {
          cooperation_penalty: -3,
          tariff_increase: 2,
          gdp_growth: -0.2
        }
      });
    }

    // Cross-border Infrastructure Project
    if (eventProbability < 0.2 && cooperationIndex > 65) {
      events.push({
        id: 'infrastructure_project',
        name: 'Regional Infrastructure Initiative',
        description: 'Joint infrastructure project connects multiple countries',
        year,
        effects: {
          infrastructure_boost: 1.0,
          trade_volume_increase: 0.15,
          gdp_growth: 0.3
        }
      });
    }

    return events;
  }

  static updateTradeMatrix(
    currentMatrix: TradeRelationship[],
    policyChanges: { [key: string]: { [key: string]: number } }
  ): TradeRelationship[] {
    return currentMatrix.map(trade => {
      const sourceChanges = policyChanges[trade.from] || {};
      const targetChanges = policyChanges[trade.to] || {};

      let newTradeVolume = trade.tradeVolume;
      let newTariffRate = trade.tariffRate;
      let newCooperation = trade.cooperation;

      // Trade policy effects
      if (sourceChanges.trade_openness) {
        const openness = sourceChanges.trade_openness / 100;
        newTradeVolume *= (1 + openness * 0.1);
        newTariffRate *= (1 - openness * 0.2);
      }

      // Infrastructure effects on trade
      if (sourceChanges.infrastructure_investment || targetChanges.infrastructure_investment) {
        const avgInfra = ((sourceChanges.infrastructure_investment || 0) + 
                         (targetChanges.infrastructure_investment || 0)) / 2;
        newTradeVolume *= (1 + (avgInfra - 5) * 0.02);
      }

      // Cooperation effects
      if (sourceChanges.cooperation_policy) {
        newCooperation = Math.max(0, Math.min(100, 
          newCooperation + sourceChanges.cooperation_policy
        ));
      }

      return {
        ...trade,
        tradeVolume: Math.max(0, newTradeVolume),
        tariffRate: Math.max(0, Math.min(50, newTariffRate)),
        cooperation: newCooperation
      };
    });
  }
}