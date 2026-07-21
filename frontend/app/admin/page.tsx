'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShieldCheck, Check, X, Loader2 } from 'lucide-react';
import AppNav from '@/components/app-nav';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PendingRequest {
  twin_id: string;
  name: string;
  title: string;
  chat_url: string;
  requested_by: string;
  requested_at: string;
}

export default function AdminPage() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push('/sign-in');
  }, [isLoaded, isSignedIn, router]);

  async function load() {
    try {
      const token = await getToken();
      if (!token) { setError('Unable to retrieve auth token.'); return; }
      const res = await fetch(`${API}/admin/pending-public-personas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) { setForbidden(true); return; }
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pending requests.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  async function act(twinId: string, action: 'approve' | 'reject') {
    setActingOn(twinId);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/admin/public-personas/${twinId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setRequests(prev => prev.filter(r => r.twin_id !== twinId));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} request.`);
    } finally {
      setActingOn(null);
    }
  }

  if (!isLoaded || loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="min-h-screen bg-gray-50">
        <AppNav />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-500">
          You don&apos;t have access to this page.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Public Persona Requests</h1>
            <p className="text-sm text-gray-500">Approve or reject requests to feature a persona on the homepage</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {requests.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No pending requests.</div>
        ) : (
          <div className="space-y-4">
            {requests.map(r => (
              <div key={r.twin_id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{r.name}</p>
                  <p className="text-sm text-gray-500">{r.title}</p>
                  <p className="text-xs text-gray-400 mt-1">Requested by {r.requested_by} · {new Date(r.requested_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => act(r.twin_id, 'approve')}
                    disabled={actingOn === r.twin_id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-40"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => act(r.twin_id, 'reject')}
                    disabled={actingOn === r.twin_id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-40"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
