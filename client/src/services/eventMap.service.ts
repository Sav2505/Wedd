import api from './api';
import type { EventMapDocument, EventMapDraft, PublishedEventMap } from '../types/eventMap';

export async function getEventMapDraft(signal?: AbortSignal): Promise<EventMapDraft> {
  return (await api.get('/event-map/draft', { signal })).data.data;
}
export async function getPublishedEventMap(signal?: AbortSignal): Promise<PublishedEventMap | null> {
  return (await api.get('/event-map/published', { signal })).data.data;
}
export async function getEventMapBackground(draft: boolean, revision: number, signal?: AbortSignal): Promise<string> {
  const response = await api.get(`/event-map/${draft ? 'draft' : 'published'}/background`, {
    params: { revision }, responseType: 'blob', signal, timeout: 60_000,
  });
  return URL.createObjectURL(response.data);
}
export async function saveEventMap(state: EventMapDraft, document: EventMapDocument, action: 'keep' | 'remove' | 'replace', file: File | null, onProgress: (progress: number) => void): Promise<EventMapDraft> {
  const form = new FormData();
  form.append('payload', JSON.stringify({
    document, backgroundAction: action, expectedRevision: state.revision, expectedPublishedRevision: state.publishedRevision,
  }));
  if (file) form.append('background', file);
  return (await api.put('/event-map/draft', form, {
    headers: { 'Content-Type': undefined }, timeout: 60_000,
    onUploadProgress: event => onProgress(event.total ? Math.round(event.loaded / event.total * 100) : 0),
  })).data.data;
}
export async function publishEventMap(state: EventMapDraft, publish: boolean): Promise<EventMapDraft> {
  return (await api.post(`/event-map/${publish ? 'publish' : 'unpublish'}`, {
    expectedRevision: state.revision, expectedPublishedRevision: state.publishedRevision,
  })).data.data;
}