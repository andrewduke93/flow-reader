
const GITHUB_API_BASE = 'https://api.github.com';

export interface GutenbergBook {
  id: number; // GitHub Repo ID
  title: string;
  author: string;
  repoName: string; // e.g. GITenberg/Moby-Dick_2701
  coverUrl: string;
  downloads: number; // Stars count as a proxy for popularity
}

export interface DownloadResult {
  blob: Blob;
  type: 'epub' | 'html' | 'text';
}

export const searchGutenberg = async (query: string): Promise<GutenbergBook[]> => {
  try {
    // Search repositories belonging to user 'GITenberg'
    // If query is empty, sort by stars (popularity) to simulate a "browse" experience
    const q = query.trim() 
      ? `${encodeURIComponent(query)}+user:GITenberg` 
      : `user:GITenberg+sort:stars`;

    const response = await fetch(`${GITHUB_API_BASE}/search/repositories?q=${q}&per_page=20`);
    
    if (response.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
    }
    
    if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
    }

    const data = await response.json();

    return data.items.map((item: any) => {
        // Parse Title and Author from description
        // GITenberg descriptions are consistently formatted as "Title by Author"
        let title = item.name.replace(/_/g, ' ');
        let author = 'Unknown';
        
        if (item.description) {
            // Remove trailing dot if present
            const cleanDesc = item.description.replace(/\.$/, '');
            const parts = cleanDesc.split(' by ');
            if (parts.length >= 2) {
                title = parts[0].trim();
                author = parts[1].trim();
            } else {
                title = cleanDesc;
            }
        }

        return {
            id: item.id,
            title,
            author,
            repoName: item.full_name,
            // Optimistically construct cover URL. We handle 404s in the UI.
            coverUrl: `https://raw.githubusercontent.com/${item.full_name}/master/cover.jpg`,
            downloads: item.stargazers_count
        };
    });
  } catch (error) {
    console.error('GITenberg search failed:', error);
    throw error;
  }
};

export const downloadGutenbergBook = async (book: GutenbergBook): Promise<DownloadResult> => {
    try {
        // 1. List contents of the repo to find a supported file
        const contentsResponse = await fetch(`${GITHUB_API_BASE}/repos/${book.repoName}/contents`);
        
        if (contentsResponse.status === 403) {
            throw new Error('GitHub API rate limit exceeded. Please try again later.');
        }

        if (!contentsResponse.ok) {
             throw new Error('Failed to access book files on GitHub.');
        }
        
        const files = await contentsResponse.json();
        
        if (!Array.isArray(files)) {
            throw new Error('Unexpected repository structure.');
        }

        // Strategy: 
        // 1. Look for .epub
        // 2. Look for .html / .htm
        // 3. Look for .txt
        
        let targetFile = files.find((f: any) => f.type === 'file' && f.name.toLowerCase().endsWith('.epub'));
        let type: 'epub' | 'html' | 'text' = 'epub';

        if (!targetFile) {
            // Prefer files with 'h' (e.g. 1234-h.htm) as they are usually the main HTML
            targetFile = files.find((f: any) => f.type === 'file' && (f.name.toLowerCase().endsWith('.htm') || f.name.toLowerCase().endsWith('.html')));
            type = 'html';
        }

        if (!targetFile) {
            // Prefer files with the ID in name or just plain .txt
            targetFile = files.find((f: any) => f.type === 'file' && f.name.toLowerCase().endsWith('.txt') && !f.name.toLowerCase().includes('readme') && !f.name.toLowerCase().includes('license'));
            type = 'text';
        }

        if (!targetFile || !targetFile.download_url) {
            throw new Error('No readable file format (EPUB, HTML, or TXT) found in this repository.');
        }

        // 2. Download using the raw download URL
        const fileResponse = await fetch(targetFile.download_url);
        
        if (!fileResponse.ok) {
            throw new Error('Failed to download the file content.');
        }

        const blob = await fileResponse.blob();
        return { blob, type };

    } catch (error) {
        console.error('Download error', error);
        throw error;
    }
};
