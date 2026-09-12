import { ChatMessage } from '../store/types';

const defaultResponses: Record<string, { answer: string; followUp?: string; insights?: string[] }> = {
  'climate': {
    answer: 'I have evaluated localized microclimate and precipitation anomalies across your region using multi-spectral satellite indices. Recent thermal telemetry reveals a +1.4°C urban surface delta compared to surrounding canopy preserves.',
    followUp: 'Would you like to overlay high-resolution heat vulnerability maps or preview carbon retention projections?',
    insights: ['Urban Heat Delta: +1.4°C', 'Canopy Cover: 34.2%', 'Annual Precipitation Trend: -8%'],
  },
  'sustainable': {
    answer: 'Synthesizing ecological corridor designs with localized zoning boundaries. A mixed-use green buffer network along the northern arterial perimeter can optimize storm runoff filtration by 42% while preserving pedestrian biophilic corridors.',
    followUp: 'Should I generate the phased transition timeline or calculate the estimated biodiversity index enhancement?',
    insights: ['Runoff Absorption: +42%', 'Buffer Width: 45m', 'Native Flora Compatibility: 96%'],
  },
  'participatory': {
    answer: 'Identified three community-driven conservation zones within the peripheral watershed. Citizen-reported micro-habitats coincide with critical riparian buffer sectors, establishing strong consensus for prioritized protection.',
    followUp: 'Would you like to review the ecological risk score distribution across these parcels?',
    insights: ['Public Engagement Score: 88%', 'Active Micro-habitats: 14', 'Zoning Classification: Eco-Protected'],
  },
};

export const getMockAiResponse = async (userPrompt: string): Promise<ChatMessage> => {
  // Simulate natural typing delay (800ms)
  await new Promise((resolve) => setTimeout(resolve, 800));

  const lower = userPrompt.toLowerCase();
  let match = defaultResponses['sustainable'];

  if (lower.includes('climate') || lower.includes('temperature') || lower.includes('weather')) {
    match = defaultResponses['climate'];
  } else if (lower.includes('participatory') || lower.includes('nature') || lower.includes('path') || lower.includes('decision')) {
    match = defaultResponses['participatory'];
  }

  return {
    id: 'ai-' + Date.now(),
    role: 'ai',
    content: match.answer,
    followUpQuestion: match.followUp,
    keyInsights: match.insights,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};
