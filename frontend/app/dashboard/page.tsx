'use client';

import { useUser, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Plus, MessageSquare, ExternalLink, Sparkles, FileText, Trash2, Share2, Star, Users } from "lucide-react";
import AppNav from "@/components/app-nav";
import { useEffect, useState } from "react";
import PersonaAvatar from "@/components/persona-avatar";

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type DepthScore = 'Basic' | 'Developed' | 'Deep';
type PublicShareStatus = 'pending' | 'approved' | 'rejected' | null;

interface Twin {
  twin_id: string;
  name: string;
  title: string;
  archetype_display_name?: string;
  created_at: string;
  chat_url: string;
  depth_score?: DepthScore;
  shared_with?: string[];
  public_share_status?: PublicShareStatus;
}

interface SharedTwin {
  twin_id: string;
  name: string;
  title: string;
  chat_url: string;
  shared_at: string;
}

const DEPTH_STYLES: Record<DepthScore, { pill: string; label: string }> = {
  Basic:     { pill: 'bg-gray-100 text-gray-500 border-gray-200',         label: 'Basic' },
  Developed: { pill: 'bg-blue-50 text-blue-600 border-blue-100',          label: 'Developed' },
  Deep:      { pill: 'bg-purple-50 text-purple-600 border-purple-100',    label: 'Deep' },
};

export default function DashboardPage() {
  const { user } = useUser();
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [twins, setTwins] = useState<Twin[]>([]);
  const [sharedTwins, setSharedTwins] = useState<SharedTwin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shareOpenId, setShareOpenId] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState('');
  const [requestingPublicId, setRequestingPublicId] = useState<string | null>(null);

  async function loadTwins() {
    const token = await getToken();
    if (!token) {
      setError("Unable to retrieve auth token.");
      return;
    }
    const [twinsRes, sharedRes] = await Promise.all([
      fetch(`${API}/users/me/twins`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/users/me/shared-twins`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (!twinsRes.ok) throw new Error(`Request failed: ${twinsRes.status} ${twinsRes.statusText}`);
    const twinsData = await twinsRes.json();
    setTwins(twinsData.twins || []);
    if (sharedRes.ok) {
      const sharedData = await sharedRes.json();
      setSharedTwins(sharedData.twins || []);
    }
  }

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    loadTwins()
      .catch(err => setError(err instanceof Error ? err.message : "Failed to load twins."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, getToken]);

  async function handleDelete(twinId: string) {
    if (!window.confirm("Delete this persona? This can't be undone.")) return;
    setDeletingId(twinId);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/twin/${twinId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      setTwins(prev => prev.filter(t => t.twin_id !== twinId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete persona.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleShareSubmit(twinId: string) {
    const email = shareEmail.trim();
    if (!email) return;
    setShareBusy(true);
    setShareError('');
    try {
      const token = await getToken();
      const res = await fetch(`${API}/twin/${twinId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || 'Failed to share');
      }
      const data = await res.json();
      setTwins(prev => prev.map(t => t.twin_id === twinId ? { ...t, shared_with: data.shared_with } : t));
      setShareEmail('');
    } catch (err) {
      setShareError(err instanceof Error ? err.message : "Failed to share persona.");
    } finally {
      setShareBusy(false);
    }
  }

  async function handleUnshare(twinId: string, email: string) {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/twin/${twinId}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(`Unshare failed: ${res.status}`);
      const data = await res.json();
      setTwins(prev => prev.map(t => t.twin_id === twinId ? { ...t, shared_with: data.shared_with } : t));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke share.");
    }
  }

  async function handleRequestPublic(twinId: string) {
    setRequestingPublicId(twinId);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/twin/${twinId}/request-public`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setTwins(prev => prev.map(t => t.twin_id === twinId ? { ...t, public_share_status: data.status } : t));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request public feature.");
    } finally {
      setRequestingPublicId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppNav />

      <main className="max-w-6xl mx-auto px-6 py-12 flex-1">
        {/* Welcome */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-100 text-purple-700 text-sm font-medium px-3.5 py-1.5 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
            Your workspace
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-base text-gray-500 mt-2">Build, refine, and share your personas</p>
        </div>

        {/* Twins grid */}
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-gray-400 text-sm">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Own twins */}
            {twins.map(twin => (
              <div key={twin.twin_id} className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <PersonaAvatar
                    name={twin.name}
                    seed={twin.twin_id}
                    className="w-16 h-16 shrink-0 border border-gray-100 shadow-sm"
                    textClassName="text-base"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xl text-gray-900">{twin.name}</h3>
                    <p className="text-base text-gray-500 mt-1">{twin.title}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {twin.archetype_display_name && (
                        <span className="text-sm text-purple-600 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-full">
                          {twin.archetype_display_name}
                        </span>
                      )}
                      {twin.depth_score && DEPTH_STYLES[twin.depth_score] && (
                        <span className={`text-sm border px-2.5 py-1 rounded-full ${DEPTH_STYLES[twin.depth_score].pill}`}>
                          {DEPTH_STYLES[twin.depth_score].label}
                        </span>
                      )}
                      {twin.public_share_status === 'pending' && (
                        <span className="text-sm text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                          Pending feature review
                        </span>
                      )}
                      {twin.public_share_status === 'approved' && (
                        <span className="flex items-center gap-1 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 px-2.5 py-1 rounded-full">
                          <Star className="w-3 h-3" /> Featured
                        </span>
                      )}
                    </div>
                    {!!twin.shared_with?.length && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {twin.shared_with.map(email => (
                          <span key={email} className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                            {email}
                            <button onClick={() => handleUnshare(twin.twin_id, email)} className="text-gray-400 hover:text-red-500" aria-label={`Stop sharing with ${email}`}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {shareOpenId === twin.twin_id && (
                  <div className="flex gap-2 items-start border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <input
                      type="email"
                      value={shareEmail}
                      onChange={e => setShareEmail(e.target.value)}
                      placeholder="their@email.com"
                      className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      onKeyDown={e => e.key === 'Enter' && handleShareSubmit(twin.twin_id)}
                    />
                    <button
                      onClick={() => handleShareSubmit(twin.twin_id)}
                      disabled={shareBusy || !shareEmail.trim()}
                      className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-40"
                    >
                      Share
                    </button>
                  </div>
                )}
                {shareOpenId === twin.twin_id && shareError && (
                  <p className="text-xs text-red-500">{shareError}</p>
                )}

                <div className="flex flex-wrap gap-3 mt-auto pt-3 border-t border-gray-100">
                  <Link
                    href={twin.chat_url}
                    className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 font-medium"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat
                  </Link>
                  <Link
                    href={`/deepen?twin_id=${twin.twin_id}`}
                    className="flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 font-medium"
                  >
                    <Sparkles className="w-4 h-4" />
                    Deepen
                  </Link>
                  <Link
                    href={`/resume?twin_id=${twin.twin_id}`}
                    className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-800 font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    Resume
                  </Link>
                  <button
                    onClick={() => {
                      setShareOpenId(shareOpenId === twin.twin_id ? null : twin.twin_id);
                      setShareEmail('');
                      setShareError('');
                    }}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  {!twin.public_share_status && (
                    <button
                      onClick={() => handleRequestPublic(twin.twin_id)}
                      disabled={requestingPublicId === twin.twin_id}
                      className="flex items-center gap-1.5 text-sm text-yellow-700 hover:text-yellow-900 font-medium disabled:opacity-40"
                    >
                      <Star className="w-4 h-4" />
                      Request feature
                    </button>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}${twin.chat_url}`)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Copy link
                  </button>
                  <button
                    onClick={() => handleDelete(twin.twin_id)}
                    disabled={deletingId === twin.twin_id}
                    className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium ml-auto disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deletingId === twin.twin_id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}

            {/* Twins shared with you */}
            {sharedTwins.map(twin => (
              <div key={twin.twin_id} className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <PersonaAvatar
                    name={twin.name}
                    seed={twin.twin_id}
                    className="w-16 h-16 shrink-0 border border-gray-100 shadow-sm"
                    textClassName="text-base"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xl text-gray-900">{twin.name}</h3>
                    <p className="text-base text-gray-500 mt-1">{twin.title}</p>
                    <span className="flex items-center gap-1 w-fit text-sm text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full mt-3">
                      <Users className="w-3.5 h-3.5" /> Shared with you
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 mt-auto pt-3 border-t border-gray-100">
                  <Link
                    href={twin.chat_url}
                    className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 font-medium"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat
                  </Link>
                </div>
              </div>
            ))}

            {/* Create new twin card */}
            {twins.length < 2 && (
              <Link
                href="/create"
                className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-7 min-h-[220px] flex flex-col items-center justify-center gap-3 hover:border-purple-400 hover:bg-purple-50 transition-colors group"
              >
                <div className="w-14 h-14 rounded-full bg-gray-100 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                  <Plus className="w-7 h-7 text-gray-400 group-hover:text-purple-600" />
                </div>
                <span className="text-base font-medium text-gray-500 group-hover:text-purple-600">
                  Create a new persona
                </span>
                <span className="text-sm text-gray-400">
                  {twins.length}/2 twins used
                </span>
              </Link>
            )}

            {twins.length === 0 && sharedTwins.length === 0 && (
              <div className="col-span-2 text-center py-8 text-gray-400 text-sm">
                You don&apos;t have any twins yet. Create your first one!
              </div>
            )}
          </div>
        )}
      </main>
      <footer className="text-center text-xs text-gray-400 py-6 border-t border-gray-100">
        © 2026 Binosus LLC · All rights reserved
      </footer>
    </div>
  );
}
