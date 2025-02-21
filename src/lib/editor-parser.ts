import * as cheerio from 'cheerio';

interface ParsedContent {
  content: string;
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
        console.log('Trying proxy:', proxyUrl);
        
        const response = await fetch(proxyUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
          console.warn(`Proxy ${proxyUrl} returned status ${response.status}`);
          continue;
        }
        
        const html = await response.text();
        
        if (html.length > 500 && 
            (html.includes('</html>') || html.includes('</body>'))) {
          console.log('Successfully fetched content with length:', html.length);
          return html;
        }
        
        console.warn(`Proxy ${proxyUrl} returned invalid content length: ${html.length}`);
      } catch (error) {
        lastError = error;
        console.warn(`Proxy ${proxyUrl} failed:`, error);
        continue;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
  }

  throw lastError || new Error('Failed to fetch content after all retries');
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s\-.,?!()«»""'']/gu, '')
    .trim();
}

function processContent($: cheerio.CheerioAPI, selector: string): string {
  const elements = $(selector);
  if (elements.length === 0) return '';

  const texts: string[] = [];
  elements.each((_, el) => {
    const text = cleanText($(el).text());
    if (text.length > 0) {
      texts.push(text);
    }
  });

  return texts.join('\n\n');
}

export async function parseUrlForEditor(url: string): Promise<ParsedContent> {
  try {
    console.log('Fetching URL for editor:', url);
    const html = await fetchWithRetry(url);
    
    const $ = cheerio.load(html, {
      decodeEntities: true,
      normalizeWhitespace: true
    });

    // Remove unwanted elements
    $('script, style, noscript, iframe, nav, footer, header, aside, .menu, .navigation, .sidebar, meta, link, svg').remove();

    // Find main content area
    const mainContent = $('main, article, .content, .post-content, #content, .entry-content').first();
    const rootElement = mainContent.length ? mainContent : $('body');

    // Extract headers
    let content = '';
    ['h1', 'h2', 'h3', 'h4'].forEach(tag => {
      rootElement.find(tag).each((_, el) => {
        const text = cleanText($(el).text());
        if (text.length >= 3 && text.length <= 200) {
          content += `<${tag}>${text}</${tag}>\n\n`;
        }
      });
    });

    // Extract paragraphs
    rootElement.find('p').each((_, el) => {
      const text = cleanText($(el).text());
      if (text.length >= 20) {
        content += `<p>${text}</p>\n\n`;
      }
    });

    // Extract lists
    rootElement.find('ul, ol').each((_, el) => {
      const $el = $(el);
      const listType = el.tagName.toLowerCase();
      const items: string[] = [];
      
      $el.find('li').each((_, li) => {
        const text = cleanText($(li).text());
        if (text.length > 0) {
          items.push(`<li>${text}</li>`);
        }
      });
      
      if (items.length > 0) {
        content += `<${listType}>${items.join('')}</${listType}>\n\n`;
      }
    });

    console.log('Parsed content length:', content.length);
    return { content: content.trim() };
  } catch (error) {
    console.error('Error parsing URL for editor:', error);
    throw error;
  }
}