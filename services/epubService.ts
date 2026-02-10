
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import { Book } from '../types';

/**
 * Extracts clean text from an HTML string.
 * It inserts newlines for block elements to preserve paragraph structure.
 */
export const extractTextFromHtml = (html: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html'); // 'text/html' is more forgiving than 'application/xhtml+xml'

  // Replace block elements with newlines to prevent words merging
  // e.g. <p>Hello</p><p>World</p> -> Hello\nWorld
  const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'br', 'hr', 'tr', 'blockquote'];
  
  blockTags.forEach(tag => {
    const elements = doc.getElementsByTagName(tag);
    // Iterate backwards because we are modifying the DOM
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (tag === 'br' || tag === 'hr') {
        el.replaceWith(doc.createTextNode('\n'));
      } else {
        // Append newline after block content
        el.after(doc.createTextNode('\n\n')); 
      }
    }
  });

  return (doc.body.textContent || '').trim();
};

/**
 * Heuristically cleans up book content to remove front-matter, copyright info, and legal headers.
 * Optimized to stop scanning once a clear start is found.
 */
export const cleanBookContent = (text: string): string => {
  // Optimization: Only scan the first 30k chars for metadata/intro garbage.
  // If the book is massive, regexing the whole string is slow.
  const SCAN_LIMIT = 30000;
  const chunk = text.slice(0, Math.min(text.length, SCAN_LIMIT));

  // 1. Gutenberg Header Removal
  // Gutenberg books start with "*** START OF THE PROJECT GUTENBERG EBOOK..."
  const gutenbergMarker = /\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/;
  const gMatch = gutenbergMarker.exec(chunk);
  if (gMatch) {
      // Find end of the header block (usually *** followed by newlines)
      const headerEnd = text.indexOf('***', gMatch.index + gMatch[0].length);
      if (headerEnd !== -1) {
          // Look for the "produced by" line which usually follows, or just skip ahead
          // We return the substring from this point onward.
          const nextContent = text.slice(headerEnd + 3).trim();
          return nextContent;
      }
  }

  // 2. Identify "Real" Start via Chapter/Prologue headers
  // Matches: Newline (or start) -> Optional whitespace -> "Chapter" or "Part" -> Number -> Word boundary
  const startRegex = /(?:^|\n\s*)(?:CHAPTER|PART)\s+(?:ONE|1|I|II|TWO)\b|(?:^|\n\s*)(?:PROLOGUE|INTRODUCTION|PREFACE)\b/i;
  const match = startRegex.exec(chunk);
  
  if (match) {
      // If we found a definitive start, cut everything before it.
      return text.slice(match.index).trim();
  }

  // 3. Fallback: Strip Copyright/Metadata blocks
  // If no "Chapter 1" found, we look for the last occurrence of copyright junk in the intro.
  const junkPattern = /(?:copyright|all rights reserved|isbn\s*:|library of congress|printed in|published by|cover design|first edition)/gi;
  let lastJunkIndex = -1;
  let m;
  
  while ((m = junkPattern.exec(chunk)) !== null) {
      lastJunkIndex = m.index;
  }
  
  if (lastJunkIndex !== -1) {
      // Find the next double newline (paragraph break) after the last junk
      const nextPara = text.indexOf('\n\n', lastJunkIndex);
      if (nextPara !== -1 && nextPara < SCAN_LIMIT + 2000) {
          return text.slice(nextPara).trim();
      }
      // Fallback to single newline
      const nextLine = text.indexOf('\n', lastJunkIndex);
      if (nextLine !== -1 && nextLine < SCAN_LIMIT + 2000) {
          return text.slice(nextLine).trim();
      }
  }
  
  return text;
};

export const createBookFromContent = (content: string, title: string, author: string, isHtml: boolean = false): Book => {
    const rawText = isHtml ? extractTextFromHtml(content) : content;
    const cleanText = cleanBookContent(rawText);
    
    // Fallback if cleaning removed everything (unlikely but safe)
    const finalContent = cleanText.length > 50 ? cleanText : rawText;

    return {
        id: uuidv4(),
        title,
        author,
        content: finalContent,
        wordCount: finalContent.split(/\s+/).length,
        progress: 0,
        lastRead: Date.now(),
        isGenerated: false,
        folder: 'library' // Default folder
    };
};

/**
 * Parses a File or Blob (EPUB) and returns a Book object.
 */
export const parseEpub = async (file: Blob | File): Promise<Book> => {
  try {
    const zip = await JSZip.loadAsync(file);

    // 1. Locate the OPF file via META-INF/container.xml
    const container = await zip.file('META-INF/container.xml')?.async('string');
    if (!container) throw new Error('Invalid EPUB: Missing container.xml');

    const containerDoc = new DOMParser().parseFromString(container, 'application/xml');
    const rootfile = containerDoc.querySelector('rootfile');
    const opfPath = rootfile?.getAttribute('full-path');

    if (!opfPath) throw new Error('Invalid EPUB: Cannot locate OPF file');

    // 2. Parse OPF to get metadata and spine
    const opfContent = await zip.file(opfPath)?.async('string');
    if (!opfContent) throw new Error('Invalid EPUB: Missing OPF file');

    const opfDoc = new DOMParser().parseFromString(opfContent, 'application/xml');
    
    // Metadata
    const title = opfDoc.querySelector('metadata > title')?.textContent || 'Untitled Book';
    const author = opfDoc.querySelector('metadata > creator')?.textContent || 'Unknown Author';

    // 3. Process Manifest (map ID -> href)
    const manifestItems = Array.from(opfDoc.querySelectorAll('manifest > item'));
    const manifest: Record<string, string> = {};
    let coverHref = '';

    manifestItems.forEach(item => {
      const id = item.getAttribute('id');
      const href = item.getAttribute('href');
      const properties = item.getAttribute('properties');
      if (id && href) {
        manifest[id] = href;
      }
      if (properties?.includes('cover-image') || id?.includes('cover')) {
        coverHref = href || '';
      }
    });

    // 4. Process Spine (Reading Order)
    const spineItems = Array.from(opfDoc.querySelectorAll('spine > itemref'));
    const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);

    let fullText = '';

    for (const item of spineItems) {
      const idref = item.getAttribute('idref');
      if (!idref || !manifest[idref]) continue;

      const href = manifest[idref];
      
      // Optimization: Skip obvious metadata files based on filename
      if (/copyright|license|nav|toc|cover/i.test(href)) {
         continue; 
      }

      // Resolve path relative to OPF location
      const fileKey = resolvePath(opfDir, href);
      
      const fileContent = await zip.file(fileKey)?.async('string');
      if (fileContent) {
        fullText += extractTextFromHtml(fileContent) + '\n\n';
      }
    }

    // 5. Clean up content (remove front-matter/junk)
    const cleanContent = cleanBookContent(fullText.trim());
    const finalContent = cleanContent.length > 100 ? cleanContent : fullText; // Safety fallback

    // 6. Extract Cover Image (if found)
    let coverUrl = undefined;
    if (coverHref) {
      const coverKey = resolvePath(opfDir, coverHref);
      const coverBlob = await zip.file(coverKey)?.async('blob');
      if (coverBlob) {
        coverUrl = URL.createObjectURL(coverBlob);
      }
    }

    return {
      id: uuidv4(),
      title,
      author,
      content: finalContent,
      wordCount: finalContent.split(/\s+/).length,
      progress: 0,
      lastRead: Date.now(),
      coverUrl,
      isGenerated: false,
      folder: 'library' // Default folder
    };

  } catch (error) {
    console.error('EPUB Parsing Failed:', error);
    throw new Error('Failed to parse EPUB file.');
  }
};

// Helper to resolve paths relative to the OPF file
const resolvePath = (base: string, relative: string): string => {
  const stack = base.split('/');
  const parts = relative.split('/');
  stack.pop(); // remove empty element from trailing slash or current filename

  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '.') continue;
    if (parts[i] === '..') stack.pop();
    else stack.push(parts[i]);
  }
  return stack.join('/');
};
