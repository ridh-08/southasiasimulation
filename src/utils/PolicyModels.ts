import { CountryStats, PolicyDecision } from '../types/GameTypes';
import { RegionalEconomySimulator } from '../data/RegionalMatrix';

export class PolicySimulator {
  static applyPolicyEffects(
    currentStats: CountryStats,
    decisions: PolicyDecision[],
    spilloverEffects: import('../types/GameTypes').PolicySpillover[] = []
  ): CountryStats {
    const newStats = { ...currentStats };
    
    // Get decision values
    const educationSpending = decisions.find(d => d.id === 'education')?.value || 0;
    const healthSpending = decisions.find(d => d.id === 'health')?.value || 0;
    const infraSpending = decisions.find(d => d.id === 'infrastructure')?.value || 0;
    const envPolicy = decisions.find(d => d.id === 'environment')?.value || 0;
    const tradePolicy = decisions.find(d => d.id === 'trade')?.value || 0;
    const tariffPolicy = decisions.find(d => d.id === 'tariff')?.value || 15;
    const cooperationPolicy = decisions.find(d => d.id === 'cooperation')?.value || 50;

    // Education effects
    const educationChange = (educationSpending - currentStats.education_spending) / 10;
    newStats.literacy_rate += educationChange * 0.8;
    newStats.gdp_growth += educationChange * 0.15; // Long-term growth
    newStats.unemployment -= educationChange * 0.2;
    newStats.education_spending = educationSpending;

    // Health effects
    const healthChange = (healthSpending - currentStats.health_expenditure) / 10;
    newStats.life_expectancy += healthChange * 0.3;
    newStats.infant_mortality -= healthChange * 1.5;
    newStats.gdp_growth += healthChange * 0.1; // Productivity gains
    newStats.health_expenditure = healthSpending;

    // Infrastructure effects
    const infraChange = (infraSpending - currentStats.infrastructure_investment) / 10;
    newStats.gdp_growth += infraChange * 0.25;
    newStats.unemployment -= infraChange * 0.15;
    newStats.poverty_rate -= infraChange * 0.3;
    newStats.infrastructure_investment = infraSpending;

    // Environmental effects
    const envChange = envPolicy / 100;
    newStats.co2_emissions *= (1 - envChange * 0.05);
    newStats.gdp_growth -= envChange * 0.08; // Short-term cost
    
    // Trade effects
    const tradeChange = tradePolicy / 100;
    newStats.gdp_growth += tradeChange * 0.12;
    newStats.unemployment -= tradeChange * 0.1;

    // Tariff effects (protectionism vs free trade)
    const tariffEffect = (tariffPolicy - 15) / 100; // Baseline 15%
    newStats.gdp_growth -= tariffEffect * 0.08; // High tariffs reduce efficiency
    newStats.unemployment += tariffEffect * 0.05; // But may protect some jobs short-term
    newStats.poverty_rate += tariffEffect * 0.1; // Higher prices hurt consumers

    // Regional cooperation effects
    const cooperationEffect = (cooperationPolicy - 50) / 100;
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
      }
    });

    // Apply bounds
    newStats.literacy_rate = Math.max(0, Math.min(100, newStats.literacy_rate));
    newStats.unemployment = Math.max(0, Math.min(50, newStats.unemployment));
    newStats.poverty_rate = Math.max(0, Math.min(80, newStats.poverty_rate));
    newStats.life_expectancy = Math.max(50, Math.min(90, newStats.life_expectancy));
    newStats.gdp_growth = Math.max(-15, Math.min(20, newStats.gdp_growth));
    newStats.co2_emissions = Math.max(0, newStats.co2_emissions);
    newStats.infant_mortality = Math.max(0, Math.min(200, newStats.infant_mortality));

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
          case 'infrastructure':
            policyChanges.infrastructure_investment = decision.value;
            break;
          case 'trade':
            policyChanges.gdp_growth = (decision.value - 50) * 0.02;
            break;
          case 'environment':
            policyChanges.co2_emissions = (decision.value - 2) * 0.1;
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
    const improvements = {
      gdp: (finalStats.gdp_growth - initialStats.gdp_growth) * 10,
      literacy: (finalStats.literacy_rate - initialStats.literacy_rate) * 2,
      life_exp: (finalStats.life_expectancy - initialStats.life_expectancy) * 5,
      unemployment: (initialStats.unemployment - finalStats.unemployment) * 3,
      poverty: (initialStats.poverty_rate - finalStats.poverty_rate) * 2,
      emissions: (initialStats.co2_emissions - finalStats.co2_emissions) * 10,
      infant_mort: (initialStats.infant_mortality - finalStats.infant_mortality) * 1
    };

    const totalScore = Object.values(improvements).reduce((sum, val) => sum + val, 0);
    return Math.max(0, Math.min(1000, totalScore + 500)); // Base score of 500
  }
}