import { supabaseClient } from './supabase';
import * as cheerio from 'cheerio';

interface ParsedContent {
  headers: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
  };
  texts: string[];
  word_count: number;
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s\-.,?!()«»""'']/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHeaderText(text: string): string {
  // Clean the text first
  const cleaned = cleanText(text);
  
  // Split by common sentence delimiters
  const parts = cleaned.split(/[.!?]/).filter(Boolean);
  
  // If we have parts, take the first meaningful one
  if (parts.length > 0) {
    const firstPart = parts[0].trim();
    if (firstPart.length >= 3) {
      return firstPart;
    }
  }
  
  // If no good sentence found, return the whole cleaned text
  return cleaned;
}

function isValidHeader(text: string): boolean {
  // Skip empty or too short/long headers
  if (!text || text.length < 3 || text.length > 200) return false;
  
  // Must contain at least one letter
  if (!/\p{L}/u.test(text)) return false;
  
  // Skip navigation-like text
  const navigationWords = ['menu', 'navigation', 'skip', 'main content', 'search'];
  if (navigationWords.some(word => text.toLowerCase().includes(word))) return false;
  
  return true;
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<string> {
  const proxyUrls = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
  ];

  let lastError;
  for (let retry = 0; retry < maxRetries; retry++) {
    for (const proxyUrl of proxyUrls) {
      try {
        const response = await fetch(proxyUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          // Add timeout
          signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
          console.warn(`Proxy ${proxyUrl} returned status ${response.status}`);
          continue;
        }
        
        const html = await response.text();
        
        // Basic validation that we got actual content
        if (html.length > 500 && 
            (html.includes('</html>') || html.includes('</body>'))) {
          return html;
        }
        
        console.warn(`Proxy ${proxyUrl} returned invalid content length: ${html.length}`);
      } catch (error) {
        lastError = error;
        console.warn(`Proxy ${proxyUrl} failed:`, error);
        continue;
      }
    }
    
    // Add increasing delay between retries
    await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
  }

  throw lastError || new Error('Failed to fetch content after all retries');
}

async function parseUrl(url: string): Promise<ParsedContent> {
  try {
    console.log('Fetching URL:', url);
    const html = await fetchWithRetry(url);
    
    const $ = cheerio.load(html, {
      decodeEntities: true,
      normalizeWhitespace: true
    });

    // Remove unwanted elements
    $('script, style, noscript, iframe, nav, footer, header, aside, .menu, .navigation, .sidebar').remove();

    // Extract text content more aggressively
    const texts: string[] = [];
    
    // Get text from paragraphs
    $('p').each((_, el) => {
      const text = cleanText($(el).text());
      if (text.length >= 20) {
        texts.push(text);
      }
    });

    // If no paragraphs found, try getting text from divs and other elements
    if (texts.length === 0) {
      $('div, article, section, main').each((_, el) => {
        const $el = $(el);
        // Skip if element contains other content containers
        if ($el.find('div, article, section, main').length === 0) {
          const text = cleanText($el.text());
          if (text.length >= 20) {
            texts.push(text);
          }
        }
      });
    }

    // Extract headers with better validation
    const headers = {
      h1: [] as string[],
      h2: [] as string[],
      h3: [] as string[],
      h4: [] as string[]
    };

    ['h1', 'h2', 'h3', 'h4'].forEach(tag => {
      $(tag).each((_, el) => {
        const $el = $(el);
        
        // Skip if header is hidden
        if ($el.css('display') === 'none' || $el.css('visibility') === 'hidden') {
          return;
        }
        
        // Get text content, removing any nested header tags first
        $el.find('h1, h2, h3, h4, h5, h6').remove();
        const headerText = cleanText($el.text());
        
        if (isValidHeader(headerText)) {
          headers[tag as keyof typeof headers].push(headerText);
        }
      });
    });

    // Calculate word count from all valid text content
    const allText = [...texts, ...Object.values(headers).flat()].join(' ');
    const wordCount = allText.split(/\s+/).filter(Boolean).length;

    return {
      headers,
      texts,
      word_count: wordCount
    };
  } catch (error) {
    console.error('Error parsing URL:', url, error);
    return {
      headers: { h1: [], h2: [], h3: [], h4: [] },
      texts: [],
      word_count: 0
    };
  }
}

export async function parseCompetitorContent(
  competitors: { domain: string; url: string }[],
  ourUrl: string | null,
  onProgress?: (progress: string) => void
): Promise<any> {
  try {
    onProgress?.('Starting content analysis...');

    const contentAnalysis = {
      our_domain: {
        headers: { h1: [], h2: [], h3: [], h4: [] },
        texts: [],
        word_count: 0
      },
      competitors: []
    };

    if (ourUrl) {
      onProgress?.(`Analyzing our content at ${ourUrl}...`);
      try {
        contentAnalysis.our_domain = await parseUrl(ourUrl);
      } catch (error) {
        console.error('Error parsing our URL:', error);
      }
    }

    for (let i = 0; i < competitors.length; i++) {
      const competitor = competitors[i];
      onProgress?.(`Analyzing competitor ${i + 1} of ${competitors.length}: ${competitor.domain}...`);
      
      try {
        const parsedContent = await parseUrl(competitor.url);
        
        if (parsedContent.word_count > 0 || 
            Object.values(parsedContent.headers).some(arr => arr.length > 0)) {
          contentAnalysis.competitors.push({
            domain: competitor.domain,
            url: competitor.url,
            ...parsedContent
          });
        }
      } catch (error) {
        console.error('Error parsing competitor URL:', competitor.url, error);
      }

      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    onProgress?.('Content analysis completed!');
    return contentAnalysis;

  } catch (error) {
    console.error('Error in parseCompetitorContent:', error);
    throw error;
  }
}