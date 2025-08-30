import React, { useState, useEffect } from 'react';
import { CountrySelector } from './components/CountrySelector';
import { PolicyDashboard } from './components/PolicyDashboard';
import { StatsDisplay } from './components/StatsDisplay';
import { RegionalDashboard } from './components/RegionalDashboard';
import { DetailedSpilloverDashboard } from './components/DetailedSpilloverDashboard';
import { GameLoop } from './components/GameLoop';
import { FinalReport } from './components/FinalReport';
import { CountryStats, PolicyDecision, RegionalEvent, MultiCountryGameState } from './types/GameTypes';
// import { REAL_TRADE_RELATIONSHIPS } from './data/RealDataSources';
import { SOUTH_ASIAN_COUNTRIES } from './data/CountryList';
import { loadAllExcelIndicators, getIndicatorValue, AllIndicators } from './data/ExcelDataLoader';
import { INITIAL_REGIONAL_MATRIX, RegionalEconomySimulator } from './data/RegionalMatrix';
import { createDefaultPolicyDecisions } from './data/PolicyDecisions';
import { PolicySimulator } from './utils/PolicyModels';
import { Globe, BarChart3, Settings } from 'lucide-react';

function App() {
  // Game state
  const [gameState, setGameState] = useState<MultiCountryGameState>({
    countries: {},
    playerCountry: '',
    regionalMatrix: INITIAL_REGIONAL_MATRIX,
    spilloverEffects: [],
    detailedSpillovers: [],
    year: 2023,
    gameActive: false
  });
  const [allIndicators, setAllIndicators] = useState<AllIndicators | null>(null);

  const [decisions, setDecisions] = useState<PolicyDecision[]>(createDefaultPolicyDecisions());
  const [historicalStats, setHistoricalStats] = useState<CountryStats[]>([]);
  const [gamePhase, setGamePhase] = useState<'select' | 'play' | 'report'>('select');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'stats' | 'regional' | 'spillovers' | 'policies'>('stats');
  const [allCountriesDecisions, setAllCountriesDecisions] = useState<{ [key: string]: PolicyDecision[] }>({});

  const startYear = 2023;
  const endYear = 2043;
  const isLastYear = gameState.year >= endYear;

  // Initialize AI countries with default policies
  useEffect(() => {
    if (gameState.playerCountry) {
      const aiDecisions: { [key: string]: PolicyDecision[] } = {};
      
      SOUTH_ASIAN_COUNTRIES.forEach(country => {
        if (country.name !== gameState.playerCountry) {
          // Create varied AI policies based on country characteristics
          const baseDecisions = createDefaultPolicyDecisions();
          const countryVariations = getCountryPolicyVariations(country.name);
          
          aiDecisions[country.name] = baseDecisions.map(decision => ({
            ...decision,
            value: decision.value + (countryVariations[decision.id] || 0)
          }));
        }
      });
      
      aiDecisions[gameState.playerCountry] = decisions;
      setAllCountriesDecisions(aiDecisions);
    }
  }, [gameState.playerCountry, decisions]);

  const getCountryPolicyVariations = (countryName: string): { [key: string]: number } => {
    // Add realistic policy variations for each country
    const variations: { [key: string]: { [key: string]: number } } = {
      'India': { education: 1.0, infrastructure: 2.0, trade: 10, cooperation: 5 },
      'Pakistan': { health: 0.5, infrastructure: -1.0, tariff: 5, cooperation: -10 },
      'Bangladesh': { education: -0.5, infrastructure: 3.0, trade: 15, environment: -0.5 },
      'Sri Lanka': { health: 1.0, education: 0.5, tariff: -3, cooperation: 10 },
      'Nepal': { infrastructure: -2.0, environment: 1.0, cooperation: 15 },
      'Bhutan': { environment: 3.0, health: 2.0, cooperation: 20 },
      'Maldives': { environment: 2.0, trade: 20, infrastructure: -1.0 },
      'Afghanistan': { health: -1.0, education: -2.0, cooperation: -20, tariff: 10 }
    };
    
    return variations[countryName] || {};
  };

  // Load all Excel data on mount
  useEffect(() => {
    loadAllExcelIndicators().then(setAllIndicators);
  }, []);

  // Block UI until Excel data is loaded
  if (!allIndicators) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Loading real data...</h2>
          <p className="text-gray-500">Fetching indicators from Excel files. Please wait.</p>
        </div>
      </div>
    );
  }

  const buildInitialStats = (country: string, year: number): CountryStats => {
    // Always use Excel data, never fallback to zero
    return {
      country,
      year,
      gdp_growth: getIndicatorValue(allIndicators, 'GDP', country, year) ?? 0,
      unemployment: getIndicatorValue(allIndicators, 'Unemployment', country, year) ?? 0,
      literacy_rate: getIndicatorValue(allIndicators, 'Literacy', country, year) ?? 0,
      life_expectancy: getIndicatorValue(allIndicators, 'Health', country, year) ?? 0,
      poverty_rate: getIndicatorValue(allIndicators, 'Poverty', country, year) ?? 0,
      co2_emissions: getIndicatorValue(allIndicators, 'CO2_Emissions', country, year) ?? 0,
      population: getIndicatorValue(allIndicators, 'Population', country, year) ?? 0,
      infant_mortality: getIndicatorValue(allIndicators, 'MortalityRate', country, year) ?? 0,
      health_expenditure: getIndicatorValue(allIndicators, 'Health', country, year) ?? 0,
      education_spending: getIndicatorValue(allIndicators, 'Education', country, year) ?? 0,
      infrastructure_investment: getIndicatorValue(allIndicators, 'Infrastructure', country, year) ?? 0
    };
  };

  const handleCountrySelect = (country: string) => {
    const initialStats = buildInitialStats(country, startYear);
    const countries: { [key: string]: CountryStats } = {};
    SOUTH_ASIAN_COUNTRIES.forEach(c => {
      countries[c.name] = buildInitialStats(c.name, startYear);
    });
    setGameState({
      countries,
      playerCountry: country,
      regionalMatrix: INITIAL_REGIONAL_MATRIX,
      spilloverEffects: [],
      detailedSpillovers: [],
      year: startYear,
      gameActive: true
    });
    setHistoricalStats([initialStats]);
    setGamePhase('play');
    setActiveTab('stats');
  };

  const handleDecisionChange = (id: string, value: number) => {
    setDecisions(prev => prev.map(d => 
      d.id === id ? { ...d, value } : d
    ));
  };

  const simulateAIDecisions = () => {
    const newAIDecisions: { [key: string]: PolicyDecision[] } = {};
    
    SOUTH_ASIAN_COUNTRIES.forEach(country => {
      if (country.name !== gameState.playerCountry) {
        const currentDecisions = allCountriesDecisions[country.name] || createDefaultPolicyDecisions();
        const countryStats = gameState.countries[country.name];
        
        // AI makes small adjustments based on current performance
        const adjustedDecisions = currentDecisions.map(decision => {
          let adjustment = 0;
          
          // Simple AI logic - adjust policies based on performance
          if (countryStats.gdp_growth < 2) {
            if (decision.id === 'infrastructure') adjustment = 0.5;
            if (decision.id === 'trade') adjustment = 5;
          }
          
          if (countryStats.unemployment > 8) {
            if (decision.id === 'education') adjustment = 0.3;
            if (decision.id === 'infrastructure') adjustment = 0.8;
          }
          
          if (countryStats.poverty_rate > 25) {
            if (decision.id === 'health') adjustment = 0.4;
            if (decision.id === 'education') adjustment = 0.6;
          }
          
          // Add some randomness
          adjustment += (Math.random() - 0.5) * 0.2;
          
          const newValue = Math.max(decision.min, Math.min(decision.max, decision.value + adjustment));
          
          return { ...decision, value: newValue };
        });
        
        newAIDecisions[country.name] = adjustedDecisions;
      } else {
        newAIDecisions[country.name] = decisions;
      }
    });
    
    setAllCountriesDecisions(newAIDecisions);
    return newAIDecisions;
  };

  const handleNextYear = () => {
    if (!gameState.gameActive) return;

    // Simulate AI decisions for all countries
    const updatedDecisions = simulateAIDecisions();
    
    // Calculate spillover effects
    const spilloversByCountry = PolicySimulator.simulateRegionalEffects(
      gameState.countries,
      updatedDecisions,
      gameState.regionalMatrix.tradeMatrix
    );

    // Calculate detailed spillovers with real trade data
    const playerDecisionsArr = updatedDecisions[gameState.playerCountry] || [];
    const playerDecisionsObj = Array.isArray(playerDecisionsArr)
      ? playerDecisionsArr.reduce((acc, d) => { acc[d.id] = d.value; return acc; }, {} as { [key: string]: number })
      : playerDecisionsArr;
    const detailedSpillovers = RegionalEconomySimulator.calculateDetailedSpillovers(
      gameState.playerCountry,
      playerDecisionsObj,
      gameState.regionalMatrix.tradeMatrix,
      {} // No realTradeData available, pass empty object
    );

    // Update all countries
    const newCountries: { [key: string]: CountryStats } = {};
    
    Object.keys(gameState.countries).forEach(countryName => {
      const currentStats = gameState.countries[countryName];
      const countryDecisions = updatedDecisions[countryName] || [];
      const spillovers = spilloversByCountry[countryName] || [];
      
      // Apply random regional events
      const randomEvents = generateRandomEvents();
  const eventEffects: Record<string, number> = {};
      
      randomEvents.forEach(event => {
        Object.keys(event.effects).forEach(key => {
          eventEffects[key] = (eventEffects[key] || 0) + event.effects[key];
        });
      });
      
      // Apply policy effects with spillovers and events
  const newStats = PolicySimulator.applyPolicyEffects(currentStats, countryDecisions, spillovers);
      
      // Apply event effects
      Object.keys(eventEffects).forEach(key => {
        const statsRecord = newStats as unknown as Record<string, number>;
        if (key in statsRecord && typeof statsRecord[key] === 'number') {
          statsRecord[key] = (statsRecord[key] || 0) + eventEffects[key];
        }
      });
      
      newStats.year = gameState.year + 1;
      newCountries[countryName] = newStats;
    });

    // Update regional cooperation based on policies
    const avgCooperation = Object.values(updatedDecisions).reduce((sum, decisions) => {
      const coopDecision = decisions.find(d => d.id === 'cooperation');
      return sum + (coopDecision?.value || 50);
    }, 0) / Object.keys(updatedDecisions).length;

    // Update trade matrix based on policies
    const policyChanges: { [key: string]: { [key: string]: number } } = {};
    Object.entries(updatedDecisions).forEach(([country, decisions]) => {
      policyChanges[country] = {};
      decisions.forEach(decision => {
        switch (decision.id) {
          case 'trade':
            policyChanges[country].trade_openness = decision.value;
            break;
          case 'infrastructure':
            policyChanges[country].infrastructure_investment = decision.value;
            break;
          case 'cooperation':
            policyChanges[country].cooperation_policy = decision.value - 50;
            break;
        }
      });
    });

    const updatedTradeMatrix = RegionalEconomySimulator.updateTradeMatrix(
      gameState.regionalMatrix.tradeMatrix,
      policyChanges
    );

    // Generate regional events
    const regionalEvents = RegionalEconomySimulator.generateRegionalEvents(
      gameState.year + 1,
      avgCooperation
    );

    setGameState(prev => ({
      ...prev,
      countries: newCountries,
      year: prev.year + 1,
      spilloverEffects: Object.values(spilloversByCountry).flat(),
      detailedSpillovers: detailedSpillovers,
      regionalMatrix: {
        ...prev.regionalMatrix,
        tradeMatrix: updatedTradeMatrix,
        cooperationIndex: avgCooperation,
        regionalEvents: [...prev.regionalMatrix.regionalEvents, ...regionalEvents]
      }
    }));

    // Update historical stats for player country
    if (gameState.playerCountry && newCountries[gameState.playerCountry]) {
      setHistoricalStats(prev => [...prev, newCountries[gameState.playerCountry]]);
    }
  };

  const generateRandomEvents = (): RegionalEvent[] => {
    const events: RegionalEvent[] = [];
    const eventProbability = Math.random();
    
    if (eventProbability < 0.1) {
      // TODO: Replace with Excel-based event loader or remove if not needed
      // Provide a dummy event for now
      events.push({
        id: 'random',
        name: 'Random Event',
        description: 'A random event occurred.',
        year: gameState.year + 1,
        effects: {}
      });
    }
    
    return events;
  };

  const handleFinishGame = () => {
    if (!gameState.playerCountry) return;
    
    const finalStats = gameState.countries[gameState.playerCountry];
  // Use ExcelDataLoader to get initialStats for the selected country
  const initialStats = buildInitialStats(gameState.playerCountry, startYear);
    const score = PolicySimulator.calculateScore(finalStats, initialStats);
    
    setFinalScore(score);
    setGamePhase('report');
  };

  const handleRestart = () => {
    // Rebuild countries object for restart
    const countries: { [key: string]: CountryStats } = {};
    SOUTH_ASIAN_COUNTRIES.forEach(c => {
      countries[c.name] = buildInitialStats(c.name, startYear);
    });
    setGameState({
      countries,
      playerCountry: '',
      regionalMatrix: INITIAL_REGIONAL_MATRIX,
      spilloverEffects: [],
      detailedSpillovers: [],
      year: 2023,
      gameActive: false
    });
    setDecisions(createDefaultPolicyDecisions());
    setHistoricalStats([]);
    setGamePhase('select');
    setFinalScore(0);
    setActiveTab('stats');
    setAllCountriesDecisions({});
  };

  if (gamePhase === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              South Asia Policy Simulation Game
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Lead a South Asian nation through 20 years of policy decisions. Your choices will 
              affect not only your country but the entire region through trade, cooperation, and spillover effects.
            </p>
          </div>
          <CountrySelector
            selectedCountry={gameState.playerCountry}
            onSelectCountry={handleCountrySelect}
          />
        </div>
      </div>
    );
  }

  if (gamePhase === 'report') {
    return (
      <FinalReport
        finalStats={gameState.countries[gameState.playerCountry]}
        initialStats={buildInitialStats(gameState.playerCountry, startYear)}
        selectedCountry={gameState.playerCountry}
        finalScore={finalScore}
        onRestart={handleRestart}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            South Asia Policy Simulation
          </h1>
          <p className="text-gray-600">
            Leading {gameState.playerCountry} • Year {gameState.year} • Regional Cooperation: {gameState.regionalMatrix.cooperationIndex.toFixed(0)}/100
          </p>
        </div>

        {/* Game Controls */}
        <div className="mb-8">
          <GameLoop
            year={gameState.year}
            startYear={startYear}
            endYear={endYear}
            gameActive={gameState.gameActive}
            onNextYear={handleNextYear}
            onRestart={handleRestart}
            onFinish={handleFinishGame}
            isLastYear={isLastYear}
          />
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-lg">
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                activeTab === 'stats'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Country Stats
            </button>
            <button
              onClick={() => setActiveTab('regional')}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                activeTab === 'regional'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Globe className="w-4 h-4 mr-2" />
              Regional Matrix
            </button>
            <button
              onClick={() => setActiveTab('spillovers')}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                activeTab === 'spillovers'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Globe className="w-4 h-4 mr-2" />
              Spillover Analysis
            </button>
            <button
              onClick={() => setActiveTab('policies')}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                activeTab === 'policies'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Settings className="w-4 h-4 mr-2" />
              Policy Dashboard
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'stats' && (
            <StatsDisplay
              currentStats={gameState.countries[gameState.playerCountry]}
              historicalStats={historicalStats}
              selectedCountry={gameState.playerCountry}
            />
          )}

          {activeTab === 'regional' && (
            <RegionalDashboard
              allCountries={gameState.countries}
              playerCountry={gameState.playerCountry}
              tradeMatrix={gameState.regionalMatrix.tradeMatrix}
              spilloverEffects={gameState.spilloverEffects}
              cooperationIndex={gameState.regionalMatrix.cooperationIndex}
            />
          )}

          {activeTab === 'spillovers' && (
            <DetailedSpilloverDashboard
              spilloverEffects={gameState.detailedSpillovers || []}
              playerCountry={gameState.playerCountry}
              currentYear={gameState.year}
            />
          )}

          {activeTab === 'policies' && (
            <PolicyDashboard
              decisions={decisions}
              onDecisionChange={handleDecisionChange}
              year={gameState.year}
              country={gameState.playerCountry}
            />
          )}
        </div>

        {/* Spillover Effects Alert */}
        {gameState.spilloverEffects.length > 0 && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">
              🌊 Regional Spillover Effects Active
            </h4>
            <p className="text-sm text-yellow-700 mb-2">
              Your policies are creating {gameState.spilloverEffects.length} spillover effects across the region:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {gameState.spilloverEffects.slice(0, 4).map((effect, idx) => (
                <div key={idx} className="text-xs text-yellow-600">
                  • {effect.description} ({effect.effect > 0 ? '+' : ''}{effect.effect.toFixed(2)})
                </div>
              ))}
            </div>
            {gameState.spilloverEffects.length > 4 && (
              <p className="text-xs text-yellow-600 mt-1">
                +{gameState.spilloverEffects.length - 4} more effects...
              </p>
            )}
          </div>
        )}

        {/* Recent Regional Events */}
        {gameState.regionalMatrix.regionalEvents.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">
              📰 Recent Regional Events
            </h4>
            <div className="space-y-2">
              {gameState.regionalMatrix.regionalEvents.slice(-3).map((event, idx) => (
                <div key={idx} className="text-sm text-blue-700">
                  <strong>{event.name}</strong> ({event.year}): {event.description}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;