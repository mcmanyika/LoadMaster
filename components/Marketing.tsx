import React, { useState, useEffect } from 'react';
import { MarketingAd, MarketingPost, MarketingMetric, MetricType, UserProfile } from '../types';
import {
  getMarketingAds,
  getMarketingPosts,
  getMarketingMetrics,
  createMarketingPost,
  updateMarketingPost,
  createMarketingMetric,
  updateMarketingMetric,
  getMarketingAnalytics,
  MarketingAnalytics,
  updateMarketingAd
} from '../services/marketingService';
import {
  Copy,
  Check,
  Calendar,
  BarChart3,
  MessageSquare,
  Phone,
  UserCheck,
  X,
  Plus,
  FileText,
  TrendingUp,
  Edit,
  Filter
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface MarketingProps {
  user: UserProfile;
}

export const Marketing: React.FC<MarketingProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'ads' | 'posts' | 'metrics' | 'analytics'>('ads');
  const [ads, setAds] = useState<MarketingAd[]>([]);
  const [posts, setPosts] = useState<MarketingPost[]>([]);
  const [metrics, setMetrics] = useState<MarketingMetric[]>([]);
  const [analytics, setAnalytics] = useState<MarketingAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });

  // Form states
  const [postForm, setPostForm] = useState({ adId: '', notes: '', platform: 'whatsapp', postedAt: '' });
  const [metricForm, setMetricForm] = useState({
    postId: '',
    metricType: 'response' as MetricType,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'ads') {
        const adsData = await getMarketingAds();
        setAds(adsData);
      } else if (activeTab === 'posts') {
        const [postsData, metricsData] = await Promise.all([
          getMarketingPosts(),
          getMarketingMetrics()
        ]);
        setPosts(postsData);
        setMetrics(metricsData);
      } else if (activeTab === 'metrics') {
        const metricsData = await getMarketingMetrics();
        setMetrics(metricsData);
      } else if (activeTab === 'analytics') {
        const analyticsData = await getMarketingAnalytics();
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error('Error fetching marketing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPostId) {
        // Update existing post
        await updateMarketingPost(editingPostId, {
          adId: postForm.adId || '',
          postedAt: postForm.postedAt || new Date().toISOString(),
          platform: postForm.platform,
          notes: postForm.notes || undefined
        });
      } else {
        // Create new post
        await createMarketingPost({
          adId: postForm.adId || '', // Can be empty for general posts
          postedAt: postForm.postedAt || new Date().toISOString(),
          postedBy: user.id,
          platform: postForm.platform,
          notes: postForm.notes || undefined
        });
      }
      setShowPostForm(false);
      setEditingPostId(null);
      setPostForm({ adId: '', notes: '', platform: 'whatsapp', postedAt: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error saving post:', error);
      const errorMessage = error?.message || error?.error_description || 'Unknown error occurred';
      alert(`Failed to ${editingPostId ? 'update' : 'create'} post: ${errorMessage}`);
    }
  };

  const handleEditPost = (post: MarketingPost) => {
    setEditingPostId(post.id);
    setPostForm({
      adId: post.adId || '',
      notes: post.notes || '',
      platform: post.platform,
      postedAt: post.postedAt
    });
    setShowPostForm(true);
  };

  const handleCancelEdit = () => {
    setShowPostForm(false);
    setEditingPostId(null);
    setPostForm({ adId: '', notes: '', platform: 'whatsapp', postedAt: '' });
  };

  const handleCreateMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMetricId) {
        // Update existing metric
        await updateMarketingMetric(editingMetricId, {
          postId: metricForm.postId,
          metricType: metricForm.metricType,
          contactName: metricForm.contactName || undefined,
          contactPhone: metricForm.contactPhone || undefined,
          contactEmail: metricForm.contactEmail || undefined,
          notes: metricForm.notes || undefined
        });
      } else {
        // Create new metric
        await createMarketingMetric({
          postId: metricForm.postId,
          metricType: metricForm.metricType,
          contactName: metricForm.contactName || undefined,
          contactPhone: metricForm.contactPhone || undefined,
          contactEmail: metricForm.contactEmail || undefined,
          notes: metricForm.notes || undefined,
          createdBy: user.id
        });
      }
      setShowMetricForm(false);
      setSelectedPostId(null);
      setEditingMetricId(null);
      setMetricForm({
        postId: '',
        metricType: 'response',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        notes: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error saving metric:', error);
      alert(`Failed to ${editingMetricId ? 'update' : 'create'} metric`);
    }
  };

  const handleEditMetric = (metric: MarketingMetric) => {
    setEditingMetricId(metric.id);
    setSelectedPostId(metric.postId || null);
    setMetricForm({
      postId: metric.postId || '',
      metricType: metric.metricType,
      contactName: metric.contactName || '',
      contactPhone: metric.contactPhone || '',
      contactEmail: metric.contactEmail || '',
      notes: metric.notes || ''
    });
    setShowMetricForm(true);
  };

  const handleCancelMetricEdit = () => {
    setShowMetricForm(false);
    setSelectedPostId(null);
    setEditingMetricId(null);
    setMetricForm({
      postId: '',
      metricType: 'response',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      notes: ''
    });
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {(['ads', 'posts', 'metrics', 'analytics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab === 'ads' && 'Ad Library'}
              {tab === 'posts' && 'Posting History'}
              {tab === 'metrics' && 'Response Tracker'}
              {tab === 'analytics' && 'Analytics'}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-slate-400">Loading...</div>
        </div>
      ) : (
        <>
          {/* Ads Tab */}
          {activeTab === 'ads' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-800">Weekly Ad Variations</h2>
                <p className="text-sm text-slate-500">12 pre-written ad variations for weekly posting</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {ads.map((ad) => (
                  <div key={ad.id} className="bg-white rounded-lg border border-slate-200 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">{ad.title}</h3>
                        <p className="text-sm text-slate-500">Week {ad.weekNumber}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(ad.content, ad.id)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        {copiedId === ad.id ? (
                          <>
                            <Check size={16} />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono">
                        {ad.content}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts Tab */}
          {activeTab === 'posts' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-800">Posting History</h2>
                <button
                  onClick={() => {
                    setEditingPostId(null);
                    setPostForm({ adId: '', notes: '', platform: 'whatsapp', postedAt: '' });
                    setShowPostForm(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={16} />
                  Log Post
                </button>
              </div>

              {showPostForm && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">
                    {editingPostId ? 'Edit Post' : 'Log New Post'}
                  </h3>
                  <form onSubmit={handleCreatePost} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Ad (optional)</label>
                      <select
                        value={postForm.adId}
                        onChange={(e) => setPostForm({ ...postForm, adId: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">No specific ad (general post)</option>
                        {ads.map((ad) => (
                          <option key={ad.id} value={ad.id}>
                            Week {ad.weekNumber}: {ad.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Posted Date</label>
                      <input
                        type="datetime-local"
                        value={postForm.postedAt ? (() => {
                          const date = new Date(postForm.postedAt);
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          const hours = String(date.getHours()).padStart(2, '0');
                          const minutes = String(date.getMinutes()).padStart(2, '0');
                          return `${year}-${month}-${day}T${hours}:${minutes}`;
                        })() : ''}
                        onChange={(e) => setPostForm({ ...postForm, postedAt: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Platform</label>
                      <select
                        value={postForm.platform}
                        onChange={(e) => setPostForm({ ...postForm, platform: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="whatsapp">WhatsApp</option>
                        <option value="facebook">Facebook</option>
                        <option value="instagram">Instagram</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                      <textarea
                        value={postForm.notes}
                        onChange={(e) => setPostForm({ ...postForm, notes: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Add any additional notes about this post..."
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {editingPostId ? 'Update Post' : 'Log Post'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {showMetricForm && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">
                    {editingMetricId ? 'Edit Response' : 'Add Response'}
                  </h3>
                  <form onSubmit={handleCreateMetric} className="space-y-4">
                    {selectedPostId ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">{editingMetricId ? 'Editing response for:' : 'Adding response to:'}</span>{' '}
                          {(() => {
                            const post = posts.find(p => p.id === selectedPostId);
                            if (!post) return 'Selected post';
                            const ad = ads.find(a => a.id === post.adId);
                            return ad ? `Week ${ad.weekNumber}: ${ad.title} - ${new Date(post.postedAt).toLocaleDateString()}` : `Post from ${new Date(post.postedAt).toLocaleDateString()}`;
                          })()}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Related Post (optional)</label>
                        <select
                          value={metricForm.postId}
                          onChange={(e) => setMetricForm({ ...metricForm, postId: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">Select a post...</option>
                          {posts.map((post) => {
                            const ad = ads.find((a) => a.id === post.adId);
                            return (
                              <option key={post.id} value={post.id}>
                                {ad ? `Week ${ad.weekNumber}: ${ad.title}` : 'Unknown'} - {new Date(post.postedAt).toLocaleDateString()}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Response Type</label>
                      <select
                        required
                        value={metricForm.metricType}
                        onChange={(e) => setMetricForm({ ...metricForm, metricType: e.target.value as MetricType })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="response">Response</option>
                        <option value="call_scheduled">Call Scheduled</option>
                        <option value="demo_scheduled">Demo Scheduled</option>
                        <option value="conversion">Conversion</option>
                        <option value="not_interested">Not Interested</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                        <input
                          type="text"
                          value={metricForm.contactName}
                          onChange={(e) => setMetricForm({ ...metricForm, contactName: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={metricForm.contactPhone}
                          onChange={(e) => setMetricForm({ ...metricForm, contactPhone: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={metricForm.contactEmail}
                        onChange={(e) => setMetricForm({ ...metricForm, contactEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                      <textarea
                        value={metricForm.notes}
                        onChange={(e) => setMetricForm({ ...metricForm, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {editingMetricId ? 'Update Response' : 'Save Response'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelMetricEdit}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Date Filter */}
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter size={18} className="text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">Filter by Date:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">From:</label>
                    <input
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">To:</label>
                    <input
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>
                  {(dateFilter.startDate || dateFilter.endDate) && (
                    <button
                      onClick={() => setDateFilter({ startDate: '', endDate: '' })}
                      className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {(() => {
                  // Filter posts by date range
                  const filteredPosts = posts.filter((post) => {
                    const postDate = new Date(post.postedAt);
                    if (dateFilter.startDate) {
                      const startDate = new Date(dateFilter.startDate);
                      startDate.setHours(0, 0, 0, 0);
                      if (postDate < startDate) return false;
                    }
                    if (dateFilter.endDate) {
                      const endDate = new Date(dateFilter.endDate);
                      endDate.setHours(23, 59, 59, 999);
                      if (postDate > endDate) return false;
                    }
                    return true;
                  });

                  if (filteredPosts.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-500">
                        {posts.length === 0 
                          ? 'No posts logged yet. Click "Log Post" to get started.'
                          : 'No posts found in the selected date range.'}
                      </div>
                    );
                  }

                  return filteredPosts.map((post) => {
                    const ad = post.adId ? ads.find((a) => a.id === post.adId) : null;
                    const postMetrics = metrics.filter((m) => m.postId === post.id);
                    return (
                      <div key={post.id} className="bg-white rounded-lg border border-slate-200 p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-slate-800">
                              {ad ? `Week ${ad.weekNumber}: ${ad.title}` : 'General Post'}
                            </h3>
                            <p className="text-sm text-slate-500">
                              Posted on {new Date(post.postedAt).toLocaleDateString()} via {post.platform}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditPost(post)}
                              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <Edit size={16} />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setEditingMetricId(null);
                                setSelectedPostId(post.id);
                                setMetricForm({ 
                                  postId: post.id,
                                  metricType: 'response',
                                  contactName: '',
                                  contactPhone: '',
                                  contactEmail: '',
                                  notes: ''
                                });
                                setShowMetricForm(true);
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              <Plus size={16} />
                              Add Response
                            </button>
                          </div>
                        </div>
                        {post.notes && (
                          <p className="text-sm text-slate-600 mb-3 italic">{post.notes}</p>
                        )}
                        {postMetrics.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <p className="text-sm font-medium text-slate-700 mb-2">Responses ({postMetrics.length}):</p>
                            <div className="space-y-2">
                              {postMetrics.map((metric) => (
                                <div key={metric.id} className="flex items-center justify-between gap-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      metric.metricType === 'conversion' ? 'bg-green-100 text-green-700' :
                                      metric.metricType === 'call_scheduled' ? 'bg-blue-100 text-blue-700' :
                                      metric.metricType === 'demo_scheduled' ? 'bg-purple-100 text-purple-700' :
                                      metric.metricType === 'not_interested' ? 'bg-red-100 text-red-700' :
                                      'bg-slate-100 text-slate-700'
                                    }`}>
                                      {metric.metricType.replace('_', ' ')}
                                    </span>
                                    {metric.contactName && <span className="text-slate-600">{metric.contactName}</span>}
                                    {metric.contactPhone && <span className="text-slate-500">({metric.contactPhone})</span>}
                                  </div>
                                  <button
                                    onClick={() => handleEditMetric(metric)}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                                    title="Edit response"
                                  >
                                    <Edit size={14} />
                                    Edit
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Metrics Tab */}
          {activeTab === 'metrics' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-800">Response Tracker</h2>
                <button
                  onClick={() => {
                    setEditingMetricId(null);
                    setSelectedPostId(null);
                    setMetricForm({
                      postId: '',
                      metricType: 'response',
                      contactName: '',
                      contactPhone: '',
                      contactEmail: '',
                      notes: ''
                    });
                    setShowMetricForm(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={16} />
                  Add Response
                </button>
              </div>

              {showMetricForm && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">
                    {editingMetricId ? 'Edit Response' : 'Add Response'}
                  </h3>
                  <form onSubmit={handleCreateMetric} className="space-y-4">
                    {selectedPostId ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">{editingMetricId ? 'Editing response for:' : 'Adding response to:'}</span>{' '}
                          {(() => {
                            const post = posts.find(p => p.id === selectedPostId);
                            if (!post) return 'Selected post';
                            const ad = ads.find(a => a.id === post.adId);
                            return ad ? `Week ${ad.weekNumber}: ${ad.title} - ${new Date(post.postedAt).toLocaleDateString()}` : `Post from ${new Date(post.postedAt).toLocaleDateString()}`;
                          })()}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Related Post (optional)</label>
                        <select
                          value={metricForm.postId}
                          onChange={(e) => setMetricForm({ ...metricForm, postId: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">Select a post...</option>
                          {posts.map((post) => {
                            const ad = ads.find((a) => a.id === post.adId);
                            return (
                              <option key={post.id} value={post.id}>
                                {ad ? `Week ${ad.weekNumber}: ${ad.title}` : 'Unknown'} - {new Date(post.postedAt).toLocaleDateString()}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Response Type</label>
                      <select
                        required
                        value={metricForm.metricType}
                        onChange={(e) => setMetricForm({ ...metricForm, metricType: e.target.value as MetricType })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="response">Response</option>
                        <option value="call_scheduled">Call Scheduled</option>
                        <option value="demo_scheduled">Demo Scheduled</option>
                        <option value="conversion">Conversion</option>
                        <option value="not_interested">Not Interested</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                        <input
                          type="text"
                          value={metricForm.contactName}
                          onChange={(e) => setMetricForm({ ...metricForm, contactName: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={metricForm.contactPhone}
                          onChange={(e) => setMetricForm({ ...metricForm, contactPhone: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={metricForm.contactEmail}
                        onChange={(e) => setMetricForm({ ...metricForm, contactEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                      <textarea
                        value={metricForm.notes}
                        onChange={(e) => setMetricForm({ ...metricForm, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {editingMetricId ? 'Update Response' : 'Save Response'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelMetricEdit}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-3">
                {(() => {
                  // Filter metrics by date range (using createdAt)
                  const filteredMetrics = metrics.filter((metric) => {
                    const metricDate = new Date(metric.createdAt);
                    if (dateFilter.startDate) {
                      const startDate = new Date(dateFilter.startDate);
                      startDate.setHours(0, 0, 0, 0);
                      if (metricDate < startDate) return false;
                    }
                    if (dateFilter.endDate) {
                      const endDate = new Date(dateFilter.endDate);
                      endDate.setHours(23, 59, 59, 999);
                      if (metricDate > endDate) return false;
                    }
                    return true;
                  });

                  if (filteredMetrics.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-500">
                        {metrics.length === 0 
                          ? 'No responses tracked yet. Click "Add Response" to get started.'
                          : 'No responses found in the selected date range.'}
                      </div>
                    );
                  }

                  return filteredMetrics.map((metric) => {
                    const post = posts.find((p) => p.id === metric.postId);
                    const ad = post ? ads.find((a) => a.id === post.adId) : null;
                    return (
                      <div key={metric.id} className="bg-white rounded-lg border border-slate-200 p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                metric.metricType === 'conversion' ? 'bg-green-100 text-green-700' :
                                metric.metricType === 'call_scheduled' ? 'bg-blue-100 text-blue-700' :
                                metric.metricType === 'demo_scheduled' ? 'bg-purple-100 text-purple-700' :
                                metric.metricType === 'not_interested' ? 'bg-red-100 text-red-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {metric.metricType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                              <span className="text-sm text-slate-500">
                                {new Date(metric.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {metric.contactName && (
                              <p className="font-medium text-slate-800">{metric.contactName}</p>
                            )}
                            {metric.contactPhone && (
                              <p className="text-sm text-slate-600">Phone: {metric.contactPhone}</p>
                            )}
                            {metric.contactEmail && (
                              <p className="text-sm text-slate-600">Email: {metric.contactEmail}</p>
                            )}
                            {post && ad && (
                              <p className="text-xs text-slate-500 mt-2">
                                From: Week {ad.weekNumber} - {new Date(post.postedAt).toLocaleDateString()}
                              </p>
                            )}
                            {metric.notes && (
                              <p className="text-sm text-slate-600 mt-2 italic">{metric.notes}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleEditMetric(metric)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Edit size={16} />
                            Edit
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && analytics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-600">Total Posts</p>
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{analytics.totalPosts}</p>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-600">Total Responses</p>
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{analytics.totalResponses}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {analytics.responseRate.toFixed(1)}% response rate
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-600">Calls Scheduled</p>
                    <Phone className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{analytics.totalCallsScheduled}</p>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-600">Conversions</p>
                    <UserCheck className="w-5 h-5 text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{analytics.totalConversions}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {analytics.conversionRate.toFixed(1)}% conversion rate
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Responses by Type</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.metricsByType.filter(m => m.count > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {analytics.metricsByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Response Types</h3>
                  <div className="space-y-3">
                    {analytics.metricsByType.map((item, index) => (
                      <div key={item.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm text-slate-700 capitalize">
                            {item.type.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

