/**
 * Loop Detector - Detects and prevents infinite loops in WebRTC flows
 */
interface TraceEntry {
  action: string;
  timestamp: number;
  sessionId: string;
  stack?: string;
}

export class LoopDetector {
  private static instance: LoopDetector;
  private traces: TraceEntry[] = [];
  private readonly MAX_TRACES = 1000;
  private readonly LOOP_DETECTION_WINDOW = 10000; // 10 seconds
  private readonly LOOP_THRESHOLD = 5; // Same action 5 times in window
  
  static getInstance(): LoopDetector {
    if (!LoopDetector.instance) {
      LoopDetector.instance = new LoopDetector();
    }
    return LoopDetector.instance;
  }

  trace(sessionId: string, action: string, includeStack = false): void {
    const now = Date.now();
    
    // Add new trace
    const traceEntry: TraceEntry = {
      action,
      timestamp: now,
      sessionId,
      stack: includeStack ? new Error().stack : undefined
    };
    
    this.traces.push(traceEntry);
    
    // Cleanup old traces
    if (this.traces.length > this.MAX_TRACES) {
      this.traces = this.traces.slice(-this.MAX_TRACES);
    }
    
    // Check for loops
    this.detectLoop(sessionId, action, now);
  }

  private detectLoop(sessionId: string, action: string, timestamp: number): void {
    const windowStart = timestamp - this.LOOP_DETECTION_WINDOW;
    
    // Get recent actions for this session
    const recentActions = this.traces.filter(trace => 
      trace.sessionId === sessionId &&
      trace.action === action &&
      trace.timestamp >= windowStart
    );
    
    if (recentActions.length >= this.LOOP_THRESHOLD) {
      console.error(`🔄 LOOP DETECTED!`, {
        sessionId: sessionId.substring(0, 8) + '...',
        action,
        occurrences: recentActions.length,
        timeWindow: this.LOOP_DETECTION_WINDOW / 1000 + 's',
        timestamps: recentActions.map(t => new Date(t.timestamp).toLocaleTimeString())
      });
      
      // Trigger loop prevention
      this.onLoopDetected(sessionId, action);
    }
  }

  private onLoopDetected(sessionId: string, action: string): void {
    console.warn(`🛑 Breaking loop for session ${sessionId.substring(0, 8)}... action: ${action}`);
    
    // Clear traces for this session to reset detection
    this.clearSession(sessionId);
    
    // Notify other systems
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('webrtc-loop-detected', {
        detail: { sessionId, action }
      }));
    }
  }

  clearSession(sessionId: string): void {
    const initialLength = this.traces.length;
    this.traces = this.traces.filter(trace => trace.sessionId !== sessionId);
    const cleaned = initialLength - this.traces.length;
    
    if (cleaned > 0) {
      console.log(`🧹 Cleared ${cleaned} traces for session ${sessionId.substring(0, 8)}...`);
    }
  }

  getSessionTrace(sessionId: string): TraceEntry[] {
    return this.traces.filter(trace => trace.sessionId === sessionId);
  }

  getStats(): { 
    totalTraces: number;
    sessionCount: number;
    recentActions: { action: string; count: number }[];
  } {
    const now = Date.now();
    const recentWindow = now - this.LOOP_DETECTION_WINDOW;
    
    const recentTraces = this.traces.filter(trace => trace.timestamp >= recentWindow);
    const sessionIds = new Set(this.traces.map(trace => trace.sessionId));
    
    // Count recent actions
    const actionCounts: Record<string, number> = {};
    recentTraces.forEach(trace => {
      actionCounts[trace.action] = (actionCounts[trace.action] || 0) + 1;
    });
    
    const recentActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalTraces: this.traces.length,
      sessionCount: sessionIds.size,
      recentActions
    };
  }

  reset(): void {
    console.log(`🔄 Loop detector reset (${this.traces.length} traces cleared)`);
    this.traces = [];
  }
}

export const loopDetector = LoopDetector.getInstance();