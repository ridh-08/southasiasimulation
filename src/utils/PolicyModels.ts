import { CountryStats, PolicyDecision } from '../types/GameTypes';
import { RegionalEconomySimulator } from '../data/RegionalMatrix';
import { getMainTradeProducts } from '../data/TradeProductsLoader';

export class PolicySimulator {
  static applyPolicyEffects(
    currentStats: CountryStats,
    decisions: PolicyDecision[],
    spilloverEffects: import('../types/GameTypes').PolicySpillover[] = []
  ): CountryStats {
    const newStats = { ...currentStats };
    
    // Get decision values
    const educationSpending = decisions.find(d => d.id === 'education')?.value || currentStats.education_spending;
    const healthSpending = decisions.find(d => d.id === 'health')?.value || currentStats.health_expenditure;
    const infraSpending = decisions.find(d => d.id === 'infrastructure')?.value || currentStats.infrastructure_investment;
    const envPolicy = decisions.find(d => d.id === 'environment')?.value || 2.0;
    const tradePolicy = decisions.find(d => d.id === 'trade')?.value || 50;
    const tariffPolicy = decisions.find(d => d.id === 'tariff')?.value || 15;
    const cooperationPolicy = decisions.find(d => d.id === 'cooperation')?.value || 50;
    const agricultureSpending = decisions.find(d => d.id === 'agriculture')?.value || 3.5;
    const manufacturingSpending = decisions.find(d => d.id === 'manufacturing')?.value || 2.0;
    const servicesSpending = decisions.find(d => d.id === 'services')?.value || 1.5;
    const energySpending = decisions.find(d => d.id === 'energy')?.value || 4.0;
    const technologySpending = decisions.find(d => d.id === 'technology')?.value || 1.0;

    // Education effects
    const educationChange = (educationSpending - currentStats.education_spending);
    newStats.literacy_rate += educationChange * 1.2;
    newStats.gdp_growth += educationChange * 0.18; // Long-term growth
    newStats.unemployment -= educationChange * 0.25;
    newStats.education_spending = educationSpending;

    // Health effects
    const healthChange = (healthSpending - currentStats.health_expenditure);
    newStats.life_expectancy += healthChange * 0.4;
    newStats.infant_mortality -= healthChange * 2.0;
    newStats.gdp_growth += healthChange * 0.12; // Productivity gains
    newStats.health_expenditure = healthSpending;

    // Infrastructure effects
    const infraChange = (infraSpending - currentStats.infrastructure_investment);
    newStats.gdp_growth += infraChange * 0.25;
    newStats.unemployment -= infraChange * 0.18;
    newStats.poverty_rate -= infraChange * 0.35;
    newStats.infrastructure_investment = infraSpending;

    // Industry-specific effects
    const agricultureChange = agricultureSpending - 3.5; // baseline
    newStats.gdp_growth += agricultureChange * 0.08;
    newStats.poverty_rate -= agricultureChange * 0.4; // Agriculture reduces rural poverty
    
    const manufacturingChange = manufacturingSpending - 2.0;
    newStats.gdp_growth += manufacturingChange * 0.15;
    newStats.unemployment -= manufacturingChange * 0.3;
    
    const servicesChange = servicesSpending - 1.5;
    newStats.gdp_growth += servicesChange * 0.12;
    newStats.unemployment -= servicesChange * 0.2;
    
    const energyChange = energySpending - 4.0;
    newStats.gdp_growth += energyChange * 0.1;
    newStats.co2_emissions += energyChange * 0.05; // More energy = more emissions initially
    
    const technologyChange = technologySpending - 1.0;
    newStats.gdp_growth += technologyChange * 0.2; // High tech multiplier
    newStats.literacy_rate += technologyChange * 0.5; // Tech requires skills
    // Environmental effects
    const envChange = (envPolicy - 2.0); // baseline 2% GDP
    newStats.co2_emissions *= (1 - envChange * 0.03);
    newStats.gdp_growth -= envChange * 0.06; // Short-term cost, long-term benefit
    
    // Trade effects
    const tradeChange = (tradePolicy - 50) / 100; // baseline 50% openness
    newStats.gdp_growth += tradeChange * 0.12;
    newStats.unemployment -= tradeChange * 0.1;

    // Tariff effects (protectionism vs free trade)
    const tariffEffect = (tariffPolicy - 15) / 100; // Baseline 15%
    newStats.gdp_growth -= tariffEffect * 0.08; // High tariffs reduce efficiency
    newStats.unemployment += tariffEffect * 0.05; // But may protect some jobs short-term
    newStats.poverty_rate += tariffEffect * 0.1; // Higher prices hurt consumers

    // Regional cooperation effects
    const cooperationEffect = (cooperationPolicy - 50) / 100; // baseline 50%
    newStats.gdp_growth += cooperationEffect * 0.06; // Cooperation boosts trade and investment
    newStats.infrastructure_investment += cooperationEffect * 0.3; // Shared projects

    // Apply spillover effects from other countries
    spilloverEffects.forEach(spillover => {
      switch (spillover.policyType) {
        case 'trade_gdp':
          newStats.gdp_growth += spillover.effect;
          break;
        case 'infrastructure':
          newStats.infrastructure_investment += spillover.effect;
          newStats.gdp_growth += spillover.effect * 0.1;
          break;
        case 'environment':
          newStats.co2_emissions += spillover.effect;
          break;
        case 'manufacturing':
          newStats.gdp_growth += spillover.effect * 0.1;
          newStats.unemployment -= spillover.effect * 0.05;
          break;
        case 'technology':
          newStats.gdp_growth += spillover.effect * 0.15;
          newStats.literacy_rate += spillover.effect * 0.3;
          break;
        case 'energy':
          newStats.gdp_growth += spillover.effect * 0.08;
          break;
      }
    });

    // Add some realistic year-over-year variation
    const randomVariation = (Math.random() - 0.5) * 0.5; // ±0.25% random variation
    newStats.gdp_growth += randomVariation;
    // Apply bounds
    newStats.literacy_rate = Math.max(0, Math.min(100, newStats.literacy_rate));
    newStats.unemployment = Math.max(0.5, Math.min(50, newStats.unemployment));
    newStats.poverty_rate = Math.max(0, Math.min(90, newStats.poverty_rate));
    newStats.life_expectancy = Math.max(45, Math.min(90, newStats.life_expectancy));
    newStats.gdp_growth = Math.max(-10, Math.min(15, newStats.gdp_growth));
    newStats.co2_emissions = Math.max(0, newStats.co2_emissions);
    newStats.infant_mortality = Math.max(1, Math.min(150, newStats.infant_mortality));
    newStats.population = Math.max(100000, newStats.population); // Minimum population

    return newStats;
  }

  static simulateRegionalEffects(
    allCountries: { [key: string]: CountryStats },
    allDecisions: { [key: string]: PolicyDecision[] },
    tradeMatrix: import('../types/GameTypes').TradeRelationship[]
  ): { [key: string]: import('../types/GameTypes').PolicySpillover[] } {
    const spilloversByCountry: { [key: string]: import('../types/GameTypes').PolicySpillover[] } = {};

    Object.keys(allCountries).forEach(sourceCountry => {
      const decisions = allDecisions[sourceCountry] || [];
      const policyChanges: { [key: string]: number } = {};

      // Extract policy changes
      decisions.forEach(decision => {
        switch (decision.id) {
          case 'education':
            policyChanges.education = decision.value;
            break;
          case 'health':
            policyChanges.health = decision.value;
            break;
          case 'infrastructure':
            policyChanges.infrastructure = decision.value;
            break;
          case 'environment':
            policyChanges.environment = decision.value;
            break;
          case 'agriculture':
            policyChanges.agriculture = decision.value;
            break;
          case 'manufacturing':
            policyChanges.manufacturing = decision.value;
            break;
          case 'services':
            policyChanges.services = decision.value;
            break;
          case 'energy':
            policyChanges.energy = decision.value;
            break;
          case 'technology':
            policyChanges.technology = decision.value;
            break;
          case 'tourism':
            policyChanges.tourism = decision.value;
            break;
          case 'trade':
            policyChanges.trade = decision.value;
            break;
          case 'tariff':
            policyChanges.tariff = decision.value;
            break;
          case 'cooperation':
            policyChanges.cooperation = decision.value;
            break;
        }
      });

      // Calculate spillovers to other countries
      const spillovers = RegionalEconomySimulator.calculateTradeSpillovers(
        sourceCountry,
        policyChanges,
        tradeMatrix
      );

      spillovers.forEach(spillover => {
        if (!spilloversByCountry[spillover.targetCountry]) {
          spilloversByCountry[spillover.targetCountry] = [];
        }
        spilloversByCountry[spillover.targetCountry].push(spillover);
      });
    });

    return spilloversByCountry;
  }

  static calculateScore(finalStats: CountryStats, initialStats: CountryStats): number {
    // More comprehensive scoring system
    const improvements = {
      gdp: (finalStats.gdp_growth - initialStats.gdp_growth) * 15,
      literacy: (finalStats.literacy_rate - initialStats.literacy_rate) * 3,
      life_exp: (finalStats.life_expectancy - initialStats.life_expectancy) * 8,
      unemployment: (initialStats.unemployment - finalStats.unemployment) * 5,
      poverty: (initialStats.poverty_rate - finalStats.poverty_rate) * 4,
      emissions: (initialStats.co2_emissions - finalStats.co2_emissions) * 15,
      infant_mort: (initialStats.infant_mortality - finalStats.infant_mortality) * 2
    };

    // Calculate weighted score
    const totalScore = Object.values(improvements).reduce((sum, val) => sum + val, 0);
    
    // Bonus for balanced development (no single indicator declining too much)
    const balanceBonus = Object.values(improvements).every(val => val > -50) ? 100 : 0;
    
    // Penalty for extreme negative outcomes
    const extremePenalty = Object.values(improvements).some(val => val < -100) ? -200 : 0;
    
    return Math.max(0, Math.min(1000, totalScore + 400 + balanceBonus + extremePenalty)); // Base score of 400
  }
}