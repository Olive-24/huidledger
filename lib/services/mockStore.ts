// Simple event emitter for mock real-time subscriptions.
// When a service mutates data it emits an event; subscribers re-read the data.
// This simulates Firestore's onSnapshot without any network.

type Listener = () => void;

class MockStore {
  private listeners: Map<string, Set<Listener>> = new Map();

  /** Subscribe to a channel. Returns an unsubscribe function. */
  subscribe(channel: string, listener: Listener): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(listener);
    return () => this.listeners.get(channel)?.delete(listener);
  }

  /** Notify all listeners on a channel. */
  emit(channel: string) {
    this.listeners.get(channel)?.forEach((fn) => fn());
  }

  /** Notify all listeners whose channel starts with a prefix. */
  emitPrefix(prefix: string) {
    this.listeners.forEach((_, channel) => {
      if (channel.startsWith(prefix)) {
        this.listeners.get(channel)?.forEach((fn) => fn());
      }
    });
  }
}

// Singleton store — channels used:
//   "batches"            → all batch lists
//   "batch:<id>"         → single batch
//   "items:<batchId>"    → item list for a batch
//   "config"             → app config
export const mockStore = new MockStore();
