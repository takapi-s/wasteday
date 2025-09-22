// Browsing-related types for WasteDay application

export interface BrowsingSession {
  id: string;
  domain: string;
  url: string;
  title?: string;
  start_time: string;
  duration_seconds: number;
  category_id?: number;
  tab_id?: number;
}

export interface Domain {
  id?: number;
  domain: string;
  category_id?: number;
  is_active: boolean;
}

export interface BrowsingSessionsQuery {
  since?: string;
  until?: string;
  domain?: string;
}

export interface BrowserData {
  url: string;
  domain: string;
  title: string;
  timestamp: string;
  duration?: number;
  tab_id?: number;
}

export interface BrowsingStats {
  total_time: number;
  domain_count: number;
  top_domains: Array<{
    domain: string;
    total_time: number;
    visit_count: number;
    category_id?: number;
  }>;
  category_breakdown: Array<{
    category_id?: number;
    category_name?: string;
    total_time: number;
    domain_count: number;
  }>;
}
