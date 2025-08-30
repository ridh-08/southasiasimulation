import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { DetailedSpilloverEffect, BilateralTradeData } from '../types/GameTypes';
import { SOUTH_ASIAN_COUNTRIES } from '../data/CountryList';
import { REAL_TRADE_RELATIONSHIPS } from '../data/RealDataSources';
import { ArrowRight, TrendingUp, TrendingDown, Clock, Target, Globe2 } from 'lucide-react';

interface DetailedSpilloverDashboardProps {
  spilloverEffects: DetailedSpilloverEffect[];
  playerCountry: string;
  currentYear: number;
}

export const DetailedSpilloverDashboard: React.FC<DetailedSpilloverDashboardProps> = ({
  spilloverEffects,
  playerCountry,
  currentYear
}) => {
  const networkRef = useRef<SVGSVGElement>(null);
  const timelineRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    drawSpilloverNetwork();
    drawSpilloverTimeline();
  }, [spilloverEffects, playerCountry]);

  const drawSpilloverNetwork = () => {
    if (!networkRef.current) return;

    const svg = d3.select(networkRef.current);
    svg.selectAll('*').remove();

    const width = 600;
    const height = 400;
    svg.attr('width', width).attr('height', height);

    // Create nodes for countries
    const countries = SOUTH_ASIAN_COUNTRIES.map(country => ({
      id: country.name,
      name: country.name,
      flag: country.flag,
      color: country.color,
      isPlayer: country.name === playerCountry,
      spilloverCount: spilloverEffects.filter(s => 
        s.sourceCountry === country.name || s.targetCountry === country.name
      ).length
    }));

    // Create links from spillover effects
    const links = spilloverEffects.map(effect => ({
      source: effect.sourceCountry,
      target: effect.targetCountry,
      magnitude: Math.abs(effect.magnitude),
      effect: effect.magnitude,
      type: effect.effectType,
      description: effect.description,
      timeframe: effect.timeframe
    }));

    // Set up force simulation
    const simulation = d3.forceSimulation(countries as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Draw links with different styles based on effect type
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', (d: any) => {
        switch (d.type) {
          case 'trade': return '#3B82F6';
          case 'investment': return '#10B981';
          case 'technology': return '#8B5CF6';
          case 'environment': return '#F59E0B';
          default: return '#6B7280';
        }
      })
      .attr('stroke-width', (d: any) => Math.max(1, d.magnitude * 20))
      .attr('stroke-opacity', 0.7)
      .attr('stroke-dasharray', (d: any) => d.effect < 0 ? '5,5' : 'none');

    // Add arrowheads
    svg.append('defs').selectAll('marker')
      .data(['trade', 'investment', 'technology', 'environment'])
      .enter().append('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', d => {
        switch (d) {
          case 'trade': return '#3B82F6';
          case 'investment': return '#10B981';
          case 'technology': return '#8B5CF6';
          case 'environment': return '#F59E0B';
          default: return '#6B7280';
        }
      });

    link.attr('marker-end', (d: any) => `url(#arrow-${d.type})`);

    // Draw nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(countries)
      .enter().append('g');

    // Country circles
    node.append('circle')
      .attr('r', (d: any) => Math.max(20, 15 + d.spilloverCount * 2))
      .attr('fill', (d: any) => d.color)
      .attr('stroke', (d: any) => d.isPlayer ? '#1E40AF' : '#fff')
      .attr('stroke-width', (d: any) => d.isPlayer ? 4 : 2)
      .attr('opacity', 0.8);

    // Country flags
    node.append('text')
      .text((d: any) => d.flag)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '16px');

    // Country names
    node.append('text')
      .text((d: any) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', '35px')
      .style('font-size', '10px')
      .style('font-weight', (d: any) => d.isPlayer ? 'bold' : 'normal');

    // Spillover count badges
    node.filter((d: any) => d.spilloverCount > 0)
      .append('circle')
      .attr('cx', 15)
      .attr('cy', -15)
      .attr('r', 8)
      .attr('fill', '#EF4444')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    node.filter((d: any) => d.spilloverCount > 0)
      .append('text')
      .attr('x', 15)
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '10px')
      .style('fill', 'white')
      .style('font-weight', 'bold')
      .text((d: any) => d.spilloverCount);

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Add tooltips
    node.append('title')
      .text((d: any) => `${d.name}\nSpillover Effects: ${d.spilloverCount}`);

    link.append('title')
      .text((d: any) => `${d.description}\nMagnitude: ${d.magnitude.toFixed(3)}\nTimeframe: ${d.timeframe}`);
  };

  const drawSpilloverTimeline = () => {
    if (!timelineRef.current) return;

    const svg = d3.select(timelineRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Group spillovers by timeframe
    const timeframeData = d3.rollup(
      spilloverEffects,
      v => v.length,
      d => d.timeframe
    );

    const data = Array.from(timeframeData, ([timeframe, count]) => ({
      timeframe,
      count
    }));

    const xScale = d3.scaleBand()
      .domain(data.map(d => d.timeframe))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) as number])
      .nice()
      .range([height, 0]);

    // Bars
    g.selectAll('.bar')
      .data(data)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.timeframe) as number)
      .attr('width', xScale.bandwidth())
      .attr('y', d => yScale(d.count))
      .attr('height', d => height - yScale(d.count))
      .attr('fill', d => {
        switch (d.timeframe) {
          case 'immediate': return '#EF4444';
          case 'short-term': return '#F59E0B';
          case 'medium-term': return '#3B82F6';
          case 'long-term': return '#10B981';
          default: return '#6B7280';
        }
      })
      .attr('opacity', 0.8);

    // Value labels
    g.selectAll('.label')
      .data(data)
      .enter().append('text')
      .attr('class', 'label')
      .attr('x', d => (xScale(d.timeframe) as number) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.count) - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text(d => d.count);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale));

    g.append('g')
      .call(d3.axisLeft(yScale));

    // Title
    svg.append('text')
      .attr('x', (width + margin.left + margin.right) / 2)
      .attr('y', margin.top - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Spillover Effects by Timeframe');
  };

  const getEffectIcon = (effectType: string) => {
    switch (effectType) {
      case 'trade': return <ArrowRight className="w-4 h-4" />;
      case 'investment': return <TrendingUp className="w-4 h-4" />;
      case 'technology': return <Target className="w-4 h-4" />;
      case 'environment': return <Globe2 className="w-4 h-4" />;
      default: return <ArrowRight className="w-4 h-4" />;
    }
  };

  const getEffectColor = (effectType: string) => {
    switch (effectType) {
      case 'trade': return 'text-blue-600 bg-blue-50';
      case 'investment': return 'text-green-600 bg-green-50';
      case 'technology': return 'text-purple-600 bg-purple-50';
      case 'environment': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTimeframeIcon = (timeframe: string) => {
    return <Clock className="w-3 h-3" />;
  };

  const getMagnitudeColor = (magnitude: number) => {
    if (magnitude > 0.1) return 'text-red-600';
    if (magnitude > 0.05) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Group spillovers by source country
  const spilloversBySource = d3.group(spilloverEffects, d => d.sourceCountry);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Detailed Spillover Analysis</h2>
          <p className="text-gray-600">
            Comprehensive view of policy interdependencies • Year {currentYear}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Total Active Spillovers</div>
          <div className="text-2xl font-bold text-blue-600">{spilloverEffects.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Spillover Network */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Regional Spillover Network</h3>
          <div className="border border-gray-200 rounded-lg p-4">
            <svg ref={networkRef}></svg>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-1 bg-blue-500 mr-2"></div>
                <span>Trade Effects</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-1 bg-green-500 mr-2"></div>
                <span>Investment Effects</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-1 bg-purple-500 mr-2"></div>
                <span>Technology Effects</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-1 bg-yellow-500 mr-2"></div>
                <span>Environmental Effects</span>
              </div>
            </div>
          </div>
        </div>

        {/* Spillover Timeline */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Effects by Timeframe</h3>
          <svg ref={timelineRef}></svg>
        </div>
      </div>

      {/* Detailed Spillover List */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Active Spillover Effects</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {Array.from(spilloversBySource.entries()).map(([sourceCountry, effects]) => (
            <div key={sourceCountry} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-800">
                  {SOUTH_ASIAN_COUNTRIES.find(c => c.name === sourceCountry)?.flag} {sourceCountry}
                  {sourceCountry === playerCountry && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">YOU</span>
                  )}
                </h4>
                <span className="text-sm text-gray-500">{effects.length} effects</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {effects.slice(0, 6).map((effect, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`p-1 rounded ${getEffectColor(effect.effectType)}`}>
                      {getEffectIcon(effect.effectType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800">
                          → {SOUTH_ASIAN_COUNTRIES.find(c => c.name === effect.targetCountry)?.flag} {effect.targetCountry}
                        </span>
                        <span className={`text-xs font-bold ${getMagnitudeColor(Math.abs(effect.magnitude))}`}>
                          {effect.magnitude > 0 ? '+' : ''}{effect.magnitude.toFixed(3)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{effect.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center">
                          {getTimeframeIcon(effect.timeframe)}
                          <span className="ml-1">{effect.timeframe}</span>
                        </div>
                        {effect.sector && (
                          <span className="bg-gray-200 px-2 py-1 rounded text-xs">
                            {effect.sector}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {effects.length > 6 && (
                  <div className="col-span-full text-center text-sm text-gray-500">
                    +{effects.length - 6} more effects...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-800">Trade Spillovers</h4>
          <p className="text-2xl font-bold text-blue-600">
            {spilloverEffects.filter(s => s.effectType === 'trade').length}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold text-green-800">Investment Effects</h4>
          <p className="text-2xl font-bold text-green-600">
            {spilloverEffects.filter(s => s.effectType === 'investment').length}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-semibold text-purple-800">Technology Transfer</h4>
          <p className="text-2xl font-bold text-purple-600">
            {spilloverEffects.filter(s => s.effectType === 'technology').length}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-semibent text-yellow-800">Environmental Impact</h4>
          <p className="text-2xl font-bold text-yellow-600">
            {spilloverEffects.filter(s => s.effectType === 'environment').length}
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">Understanding Spillover Effects</h4>
        <p className="text-sm text-blue-700">
          Spillover effects show how your policy decisions impact neighboring countries through trade, 
          investment, technology transfer, and environmental channels. Positive effects (green) benefit 
          your neighbors, while negative effects (red) may create tensions. The network visualization 
          shows the intensity and direction of these interdependencies across South Asia.
        </p>
      </div>
    </div>
  );
};