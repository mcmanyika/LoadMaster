import { supabase, isSupabaseConfigured } from './supabaseClient';
import { MarketingAd, MarketingPost, MarketingMetric, MetricType } from '../types';

// Mock data for demo mode - All 12 weekly variations
const MOCK_ADS: MarketingAd[] = [
  {
    id: '1',
    weekNumber: 1,
    title: 'Pain Point Focus',
    content: 'Still using Excel to manage your trucking business?\n\nTired of manual calculations for driver pay, dispatch fees, and fuel expenses?\n\nLoadMaster automates everything - from Rate Confirmations to financial tracking.\n\nStop wasting time on spreadsheets. Start managing smarter.\n\nCall us: 469-473-8724\nSchedule a meeting today!',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    weekNumber: 2,
    title: 'Solution Focus',
    content: 'Excel spreadsheets are holding your trucking business back.\n\nLoadMaster is the modern solution designed for trucking owners who want to scale.\n\nTrack loads, manage finances, calculate payouts - all in one place.\n\nReady to upgrade your workflow?\n\nContact us: 469-473-8724\nLet\'s discuss how we can help.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    weekNumber: 3,
    title: 'Feature Highlight',
    content: 'What if you could:\n• Store Rate Confirmations digitally (no more lost PDFs)\n• Automatically calculate driver and dispatcher pay\n• Track all loads in one dashboard\n• Access your data anywhere, anytime\n\nLoadMaster makes this possible.\n\nCall: 469-473-8724\nSchedule a demo today!',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    weekNumber: 4,
    title: 'Time Savings',
    content: 'How many hours do you spend each week on Excel spreadsheets?\n\nLoadMaster gives you that time back.\n\nAutomated calculations. Digital document storage. Real-time tracking.\n\nFocus on growing your business, not managing spreadsheets.\n\nGet started: 469-473-8724',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '5',
    weekNumber: 5,
    title: 'Problem-Solution',
    content: 'The Problem: Excel spreadsheets for trucking management\n• Easy to make calculation errors\n• Hard to track multiple loads\n• Rate Confirmations get lost\n• Time-consuming manual work\n\nThe Solution: LoadMaster\nA complete management system built for trucking businesses.\n\nCall us: 469-473-8724',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '6',
    weekNumber: 6,
    title: 'Direct Question',
    content: 'Are you a trucking business owner still using Excel?\n\nIf you\'re tracking loads, expenses, and payouts in spreadsheets, we have a better solution.\n\nLoadMaster is designed specifically for modern trucking operations.\n\nLet\'s talk about how we can streamline your workflow.\n\nContact: 469-473-8724',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '7',
    weekNumber: 7,
    title: 'Benefits Focus',
    content: 'Why LoadMaster?\n\n✓ Digital Rate Confirmation storage\n✓ Automated financial calculations\n✓ Real-time load tracking\n✓ Fleet management dashboard\n✓ Dispatcher fee tracking\n✓ Driver pay calculations\n\nAll in one modern platform.\n\nCall: 469-473-8724\nSchedule a meeting!',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '8',
    weekNumber: 8,
    title: 'Comparison',
    content: 'Excel vs LoadMaster\n\nExcel:\n• Manual calculations\n• Risk of errors\n• Hard to organize\n• Time-consuming\n\nLoadMaster:\n• Automated calculations\n• Error-free tracking\n• Organized dashboard\n• Saves time\n\nWhich would you choose?\n\nCall us: 469-473-8724',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '9',
    weekNumber: 9,
    title: 'Story Angle',
    content: 'Many trucking owners start with Excel.\n\nIt works at first, but as your business grows, spreadsheets become a bottleneck.\n\nLoadMaster is designed to grow with you - from 1 truck to a full fleet.\n\nReady to make the switch?\n\nContact: 469-473-8724',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '10',
    weekNumber: 10,
    title: 'Efficiency Focus',
    content: 'Stop doing manual work that software can do for you.\n\nLoadMaster handles:\n• Rate Confirmation storage\n• Financial calculations\n• Load tracking\n• Fleet management\n\nYou handle growing your business.\n\nCall: 469-473-8724\nSchedule a demo!',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '11',
    weekNumber: 11,
    title: 'Value Proposition',
    content: 'Trucking management shouldn\'t be complicated.\n\nLoadMaster simplifies everything:\n• Store all Rate Confirmations in one place\n• Automatically calculate payouts\n• Track every load from start to finish\n• Access your data on any device\n\nBuilt for trucking owners, by people who understand your needs.\n\nContact: 469-473-8724',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '12',
    weekNumber: 12,
    title: 'Call to Action Focus',
    content: 'Ready to modernize your trucking business?\n\nLoadMaster replaces Excel spreadsheets with a complete management system.\n\nSchedule a meeting with us and we\'ll show you how it works.\n\nNo commitment, just a conversation about how we can help.\n\nCall: 469-473-8724\nLet\'s talk!',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const MOCK_POSTS: MarketingPost[] = [];
const MOCK_METRICS: MarketingMetric[] = [];

// --- MARKETING ADS OPERATIONS ---

export const getMarketingAds = async (): Promise<MarketingAd[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return MOCK_ADS;
  }

  try {
    const { data, error } = await supabase
      .from('marketing_ads')
      .select('*')
      .order('week_number', { ascending: true });

    if (error) {
      console.error('Error fetching marketing ads:', error);
      // If table doesn't exist yet, return mock data
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.warn('Marketing ads table not found. Using mock data. Please run the migration.');
        return MOCK_ADS;
      }
      throw error;
    }

    // If no data returned, use mock data as fallback
    if (!data || data.length === 0) {
      console.warn('No marketing ads found in database. Using mock data. Please run the migration to populate the database.');
      return MOCK_ADS;
    }

    return data.map((item: any) => ({
      id: item.id,
      weekNumber: item.week_number,
      title: item.title,
      content: item.content,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  } catch (error) {
    console.error('Error in getMarketingAds:', error);
    // Fallback to mock data on any error
    return MOCK_ADS;
  }
};

export const getMarketingAd = async (id: string): Promise<MarketingAd | null> => {
  if (!isSupabaseConfigured || !supabase) {
    return MOCK_ADS.find(ad => ad.id === id) || null;
  }

  const { data, error } = await supabase
    .from('marketing_ads')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching marketing ad:', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    weekNumber: data.week_number,
    title: data.title,
    content: data.content,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

export const updateMarketingAd = async (id: string, updates: Partial<MarketingAd>): Promise<MarketingAd> => {
  if (!isSupabaseConfigured || !supabase) {
    const ad = MOCK_ADS.find(a => a.id === id);
    if (!ad) throw new Error('Ad not found');
    Object.assign(ad, updates);
    return ad;
  }

  const updateData: any = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.content !== undefined) updateData.content = updates.content;
  if (updates.weekNumber !== undefined) updateData.week_number = updates.weekNumber;
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('marketing_ads')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating marketing ad:', error);
    throw error;
  }

  return {
    id: data.id,
    weekNumber: data.week_number,
    title: data.title,
    content: data.content,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

// --- MARKETING POSTS OPERATIONS ---

export const getMarketingPosts = async (): Promise<MarketingPost[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return MOCK_POSTS;
  }

  const { data, error } = await supabase
    .from('marketing_posts')
    .select('*')
    .order('posted_at', { ascending: false });

  if (error) {
    console.error('Error fetching marketing posts:', error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    adId: item.ad_id,
    postedAt: item.posted_at,
    postedBy: item.posted_by,
    platform: item.platform,
    notes: item.notes,
    createdAt: item.created_at
  }));
};

export const createMarketingPost = async (post: Omit<MarketingPost, 'id' | 'createdAt'>): Promise<MarketingPost> => {
  if (!isSupabaseConfigured || !supabase) {
    const newPost: MarketingPost = {
      ...post,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    MOCK_POSTS.unshift(newPost);
    return newPost;
  }

  try {
    // If adId is empty, allow it (for general posts)
    // Otherwise validate it's a valid UUID format
    if (post.adId && post.adId.trim() !== '') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(post.adId)) {
        // If adId is not a UUID, it's likely from mock data
        // Use mock storage for non-UUID IDs
        console.warn('Ad ID is not a valid UUID. Using mock storage.');
        const newPost: MarketingPost = {
          ...post,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString()
        };
        MOCK_POSTS.unshift(newPost);
        return newPost;
      }
    }

    const { data, error } = await supabase
      .from('marketing_posts')
      .insert([{
        ad_id: post.adId && post.adId.trim() !== '' ? post.adId : null, // Allow null for general posts
        posted_at: post.postedAt,
        posted_by: post.postedBy || null,
        platform: post.platform,
        notes: post.notes || null
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating marketing post:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // If table doesn't exist, use mock data
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.warn('Marketing posts table not found. Using mock data. Please run the migration.');
        const newPost: MarketingPost = {
          ...post,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString()
        };
        MOCK_POSTS.unshift(newPost);
        return newPost;
      }
      
      // If UUID format error, fall back to mock data
      if (error.message.includes('invalid input syntax for type uuid')) {
        console.warn('Invalid UUID format. Using mock data storage.');
        const newPost: MarketingPost = {
          ...post,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString()
        };
        MOCK_POSTS.unshift(newPost);
        return newPost;
      }
      
      throw error;
    }

    return {
      id: data.id,
      adId: data.ad_id,
      postedAt: data.posted_at,
      postedBy: data.posted_by,
      platform: data.platform,
      notes: data.notes,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Error in createMarketingPost:', error);
    throw error;
  }
};

export const updateMarketingPost = async (id: string, updates: Partial<Omit<MarketingPost, 'id' | 'createdAt'>>): Promise<MarketingPost> => {
  if (!isSupabaseConfigured || !supabase) {
    const postIndex = MOCK_POSTS.findIndex(p => p.id === id);
    if (postIndex === -1) throw new Error('Post not found');
    const updatedPost: MarketingPost = {
      ...MOCK_POSTS[postIndex],
      ...updates,
      id
    };
    MOCK_POSTS[postIndex] = updatedPost;
    return updatedPost;
  }

  try {
    const updateData: any = {};
    if (updates.adId !== undefined) {
      updateData.ad_id = updates.adId && updates.adId.trim() !== '' ? updates.adId : null;
    }
    if (updates.postedAt !== undefined) updateData.posted_at = updates.postedAt;
    if (updates.postedBy !== undefined) updateData.posted_by = updates.postedBy || null;
    if (updates.platform !== undefined) updateData.platform = updates.platform;
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;

    const { data, error } = await supabase
      .from('marketing_posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating marketing post:', error);
      throw error;
    }

    return {
      id: data.id,
      adId: data.ad_id,
      postedAt: data.posted_at,
      postedBy: data.posted_by,
      platform: data.platform,
      notes: data.notes,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Error in updateMarketingPost:', error);
    throw error;
  }
};

// --- MARKETING METRICS OPERATIONS ---

export const getMarketingMetrics = async (postId?: string): Promise<MarketingMetric[]> => {
  if (!isSupabaseConfigured || !supabase) {
    if (postId) {
      return MOCK_METRICS.filter(m => m.postId === postId);
    }
    return MOCK_METRICS;
  }

  let query = supabase
    .from('marketing_metrics')
    .select('*')
    .order('created_at', { ascending: false });

  if (postId) {
    query = query.eq('post_id', postId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching marketing metrics:', error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    postId: item.post_id,
    metricType: item.metric_type,
    contactName: item.contact_name,
    contactPhone: item.contact_phone,
    contactEmail: item.contact_email,
    notes: item.notes,
    createdAt: item.created_at,
    createdBy: item.created_by
  }));
};

export const createMarketingMetric = async (
  metric: Omit<MarketingMetric, 'id' | 'createdAt'>
): Promise<MarketingMetric> => {
  if (!isSupabaseConfigured || !supabase) {
    const newMetric: MarketingMetric = {
      ...metric,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    MOCK_METRICS.push(newMetric);
    return newMetric;
  }

  const { data, error } = await supabase
    .from('marketing_metrics')
    .insert([{
      post_id: metric.postId && metric.postId.trim() !== '' ? metric.postId : null,
      metric_type: metric.metricType,
      contact_name: metric.contactName || null,
      contact_phone: metric.contactPhone || null,
      contact_email: metric.contactEmail || null,
      notes: metric.notes || null,
      created_by: metric.createdBy || null
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating marketing metric:', error);
    throw error;
  }

  return {
    id: data.id,
    postId: data.post_id,
    metricType: data.metric_type,
    contactName: data.contact_name,
    contactPhone: data.contact_phone,
    contactEmail: data.contact_email,
    notes: data.notes,
    createdAt: data.created_at,
    createdBy: data.created_by
  };
};

export const updateMarketingMetric = async (
  id: string,
  updates: Partial<Omit<MarketingMetric, 'id' | 'createdAt' | 'createdBy'>>
): Promise<MarketingMetric> => {
  if (!isSupabaseConfigured || !supabase) {
    const metricIndex = MOCK_METRICS.findIndex(m => m.id === id);
    if (metricIndex === -1) throw new Error('Metric not found');
    const updatedMetric: MarketingMetric = {
      ...MOCK_METRICS[metricIndex],
      ...updates,
      id
    };
    MOCK_METRICS[metricIndex] = updatedMetric;
    return updatedMetric;
  }

  const updateData: any = {};
  if (updates.postId !== undefined) {
    updateData.post_id = updates.postId && updates.postId.trim() !== '' ? updates.postId : null;
  }
  if (updates.metricType !== undefined) updateData.metric_type = updates.metricType;
  if (updates.contactName !== undefined) updateData.contact_name = updates.contactName || null;
  if (updates.contactPhone !== undefined) updateData.contact_phone = updates.contactPhone || null;
  if (updates.contactEmail !== undefined) updateData.contact_email = updates.contactEmail || null;
  if (updates.notes !== undefined) updateData.notes = updates.notes || null;

  const { data, error } = await supabase
    .from('marketing_metrics')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating marketing metric:', error);
    throw error;
  }

  return {
    id: data.id,
    postId: data.post_id,
    metricType: data.metric_type,
    contactName: data.contact_name,
    contactPhone: data.contact_phone,
    contactEmail: data.contact_email,
    notes: data.notes,
    createdAt: data.created_at,
    createdBy: data.created_by
  };
};

// --- ANALYTICS OPERATIONS ---

export interface MarketingAnalytics {
  totalPosts: number;
  totalResponses: number;
  totalCallsScheduled: number;
  totalDemosScheduled: number;
  totalConversions: number;
  responseRate: number;
  conversionRate: number;
  postsByWeek: Array<{ week: number; count: number }>;
  metricsByType: Array<{ type: MetricType; count: number }>;
}

export const getMarketingAnalytics = async (): Promise<MarketingAnalytics> => {
  const [posts, metrics, ads] = await Promise.all([
    getMarketingPosts(),
    getMarketingMetrics(),
    getMarketingAds()
  ]);

  const totalPosts = posts.length;
  const totalResponses = metrics.filter(m => m.metricType === 'response').length;
  const totalCallsScheduled = metrics.filter(m => m.metricType === 'call_scheduled').length;
  const totalDemosScheduled = metrics.filter(m => m.metricType === 'demo_scheduled').length;
  const totalConversions = metrics.filter(m => m.metricType === 'conversion').length;

  const responseRate = totalPosts > 0 ? (totalResponses / totalPosts) * 100 : 0;
  const conversionRate = totalResponses > 0 ? (totalConversions / totalResponses) * 100 : 0;

  // Group posts by week number from ad
  const postsByWeek: Record<number, number> = {};
  for (const post of posts) {
    const ad = ads.find(a => a.id === post.adId);
    if (ad) {
      const week = ad.weekNumber;
      postsByWeek[week] = (postsByWeek[week] || 0) + 1;
    }
  }

  // Group metrics by type
  const metricsByType: Record<MetricType, number> = {
    response: 0,
    call_scheduled: 0,
    demo_scheduled: 0,
    conversion: 0,
    not_interested: 0
  };

  for (const metric of metrics) {
    metricsByType[metric.metricType]++;
  }

  return {
    totalPosts,
    totalResponses,
    totalCallsScheduled,
    totalDemosScheduled,
    totalConversions,
    responseRate,
    conversionRate,
    postsByWeek: Object.entries(postsByWeek).map(([week, count]) => ({
      week: parseInt(week),
      count
    })),
    metricsByType: Object.entries(metricsByType).map(([type, count]) => ({
      type: type as MetricType,
      count
    }))
  };
};

