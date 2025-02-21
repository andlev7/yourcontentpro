import { supabaseClient } from './supabase';

interface DataForSEOCredentials {
  username: string;
  password: string;
}

interface DataForSEOResult {
  url: string;
  title: string;
  description: string;
  position: number;
  domain: string;
  breadcrumb: string;
  links_count: number;
  main_domain: string;
  relative_url: string;
  etv: number;
  estimated_paid_traffic_cost: number;
  rank_group: number;
  xpath: string;
}

const SERP_API_URL = 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced';
const LOGIN = 'andmaillev@gmail.com';
const PASSWORD = 'dcadf5e1b3d4d565';

export async function createSerpTask(keyword: string, locationCode: string): Promise<DataForSEOResult[]> {
  const auth = btoa(`${LOGIN}:${PASSWORD}`);

  const data = [{
    keyword,
    location_code: parseInt(locationCode, 10),
    language_code: "uk",
    device: "desktop",
    os: "windows",
    depth: 10
  }];

  try {
    console.log('Sending request to DataForSEO:', {
      url: SERP_API_URL,
      data: data
    });

    const response = await fetch(SERP_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SERP API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`SERP API responded with status: ${response.status}`);
    }

    const result = await response.json();
    console.log('DataForSEO response:', result);
    
    if (!result?.tasks?.[0]?.result?.[0]?.items) {
      console.warn('No items found in DataForSEO response');
      return [];
    }

    // Filter and map the results
    const items = result.tasks[0].result[0].items;
    console.log('Found items:', items.length);

    return items
      .filter((item: any) => item.type === 'organic')
      .slice(0, 10)
      .map((item: any) => ({
        url: item.url,
        title: item.title,
        description: item.description,
        position: item.rank_position,
        domain: item.domain,
        breadcrumb: item.breadcrumb,
        links_count: item.links_count,
        main_domain: item.main_domain,
        relative_url: item.relative_url,
        etv: item.etv || 0,
        estimated_paid_traffic_cost: item.estimated_paid_traffic_cost || 0,
        rank_group: item.rank_group,
        xpath: item.xpath
      }));
  } catch (error) {
    console.error('SERP proxy error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch SERP results');
  }
}

export async function analyzeSerpResults(results: DataForSEOResult[]): Promise<number> {
  if (!results.length) {
    console.warn('No results to analyze');
    return 0;
  }

  console.log('Analyzing results:', results.length);

  // Analyze TOP-10 results to calculate the difficulty score
  const difficultyFactors = {
    domainAuthority: 0.4,
    contentQuality: 0.3,
    competitionLevel: 0.3
  };

  const domainAuthorityScore = results.reduce((score, result, index) => {
    const position = 10 - index;
    const linkScore = Math.min((result.links_count || 0) / 1000, 1);
    return score + (linkScore * position) / 55;
  }, 0);

  const contentQualityScore = results.reduce((score, result) => {
    const descriptionLength = result.description?.length || 0;
    const titleLength = result.title?.length || 0;
    const isOptimalLength = descriptionLength > 120 && descriptionLength < 160 && 
                           titleLength > 50 && titleLength < 60;
    return score + (isOptimalLength ? 1 : 0.5);
  }, 0) / results.length;

  const competitionScore = results.reduce((score, result) => {
    const hasPaidTraffic = (result.estimated_paid_traffic_cost || 0) > 0;
    const isStrongDomain = result.etv > 1000;
    return score + (hasPaidTraffic ? 0.5 : 0) + (isStrongDomain ? 0.5 : 0);
  }, 0) / results.length;

  const difficultyScore = Math.round(
    (domainAuthorityScore * difficultyFactors.domainAuthority +
     contentQualityScore * difficultyFactors.contentQuality +
     competitionScore * difficultyFactors.competitionLevel) * 100
  );

  console.log('Analysis scores:', {
    domainAuthorityScore,
    contentQualityScore,
    competitionScore,
    finalScore: difficultyScore
  });

  return Math.min(Math.max(difficultyScore, 0), 100);
}