/**
 * Flow Lock Manager - Prevents infinite loops in WebRTC initialization
 */
export class FlowLockManager {
  private static instance: FlowLockManager;
  private locks: Map<string, { timestamp: number; operation: string }> = new Map();
  private readonly LOCK_TIMEOUT = 30000; // 30 seconds
  
  static getInstance(): FlowLockManager {
    if (!FlowLockManager.instance) {
      FlowLockManager.instance = new FlowLockManager();
    }
    return FlowLockManager.instance;
  }

  acquireLock(sessionId: string, operation: string = 'webrtc_init'): boolean {
    const now = Date.now();
    const existingLock = this.locks.get(sessionId);
    
    // Check if lock exists and is still valid
    if (existingLock && (now - existingLock.timestamp) < this.LOCK_TIMEOUT) {
      console.log(`🔒 Lock already exists for session ${sessionId} (${existingLock.operation})`);
      return false;
    }
    
    // Acquire new lock
    this.locks.set(sessionId, { timestamp: now, operation });
    console.log(`✅ Lock acquired for session ${sessionId} (${operation})`);
    return true;
  }

  releaseLock(sessionId: string): void {
    const lock = this.locks.get(sessionId);
    if (lock) {
      this.locks.delete(sessionId);
      console.log(`🔓 Lock released for session ${sessionId} (${lock.operation})`);
    }
  }

  releaseAllLocks(): void {
    console.log(`🧹 Releasing all locks (${this.locks.size} active)`);
    this.locks.clear();
  }

  cleanupExpiredLocks(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [sessionId, lock] of this.locks.entries()) {
      if ((now - lock.timestamp) >= this.LOCK_TIMEOUT) {
        this.locks.delete(sessionId);
        cleaned++;
        console.log(`⏰ Expired lock cleaned for session ${sessionId}`);
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired locks`);
    }
  }

  hasLock(sessionId: string): boolean {
    return this.locks.has(sessionId);
  }

  getStats(): { total: number; expired: number } {
    const now = Date.now();
    let expired = 0;
    
    for (const lock of this.locks.values()) {
      if ((now - lock.timestamp) >= this.LOCK_TIMEOUT) {
        expired++;
      }
    }
    
    return {
      total: this.locks.size,
      expired
    };
  }
}

// Auto-cleanup expired locks every 10 seconds
if (typeof window !== 'undefined') {
  setInterval(() => {
    FlowLockManager.getInstance().cleanupExpiredLocks();
  }, 10000);
}

export const flowLock = FlowLockManager.getInstance();