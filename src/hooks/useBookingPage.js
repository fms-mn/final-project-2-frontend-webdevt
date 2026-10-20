import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { demoCancellationInfo, getDemoBookings } from '../data/demoBookings';
import { bookingWhen, groupHistory, loadCustomerBookings, selectHistory } from '../utils/ticketHistory';

const empty = { records: [], total: 0, overallTotal: 0, dayCounts: {}, hasMore: false, nextPage: null };

function demoPage(accountId, options) {
  const now = Date.now();
  const records = getDemoBookings(accountId).filter(booking => options.scope === 'upcoming'
    ? booking.status === 'confirmed' && bookingWhen(booking).getTime() > now
    : booking.status !== 'confirmed' || bookingWhen(booking).getTime() <= now);
  const selected = options.scope === 'history' ? selectHistory(records, { ...options, now })
    : records.sort((a, b) => bookingWhen(a) - bookingWhen(b) || String(a._id).localeCompare(String(b._id)));
  const limit = options.scope === 'history' ? 5 : 50;
  const hasMore = options.page * limit < selected.length;
  return {
    records: selected.slice((options.page - 1) * limit, options.page * limit).map(booking => ({ ...booking, cancellation: demoCancellationInfo(booking) })),
    total: selected.length, overallTotal: records.length, hasMore, nextPage: hasMore ? options.page + 1 : null,
    dayCounts: Object.fromEntries(groupHistory(selected).map(group => [group.day, group.total])),
  };
}

export default function useBookingPage({ accountId, isDemo, scope, filter = 'all', query = '', order = 'newest', revision = 0 }) {
  const key = JSON.stringify([accountId, isDemo, scope, filter, query, order, revision]);
  const activeKey = useRef(key);
  activeKey.current = key;
  const request = useRef(null);
  const [state, setState] = useState({ ...empty, key: '', loading: true, loadingMore: false, error: '', moreError: '' });
  const [retry, setRetry] = useState(0);

  async function fetchPage(page, append = false) {
    if (!accountId || request.current?.key === key) return;
    const controller = new AbortController();
    const pending = { key, controller };
    request.current = pending;
    setState(current => append ? { ...current, loadingMore: true, moreError: '' }
      : { ...empty, key, loading: true, loadingMore: false, error: '', moreError: '' });
    try {
      const options = { scope, page, filter, query, order, signal: controller.signal };
      const result = isDemo ? demoPage(accountId, options) : await loadCustomerBookings(api, options);
      if (controller.signal.aborted || activeKey.current !== key) return;
      setState(current => ({ ...result, key, records: [...new Map((append ? [...current.records, ...result.records] : result.records).map(booking => [booking._id, booking])).values()], loading: false, loadingMore: false, error: '', moreError: '' }));
    } catch (error) {
      if (controller.signal.aborted || activeKey.current !== key) return;
      setState(current => ({ ...current, loading: false, loadingMore: false, [append ? 'moreError' : 'error']: error.message }));
    } finally {
      if (request.current === pending) request.current = null;
    }
  }

  useEffect(() => {
    request.current?.controller.abort();
    request.current = null;
    if (!accountId) {
      setState({ ...empty, key, loading: false, loadingMore: false, error: '', moreError: '' });
      return;
    }
    fetchPage(1);
    return () => { request.current?.controller.abort(); request.current = null; };
  }, [key, retry]);

  const current = state.key === key ? state : { ...empty, loading: true, loadingMore: false, error: '', moreError: '' };
  const updateBooking = useCallback(booking => setState(current => current.key === key
    ? { ...current, records: current.records.map(item => item._id === booking._id ? booking : item) } : current), [key]);
  return {
    ...current,
    loadMore: () => { if (current.hasMore && !current.loading && !current.loadingMore) fetchPage(current.nextPage, true); },
    retry: () => setRetry(value => value + 1),
    updateBooking,
  };
}
