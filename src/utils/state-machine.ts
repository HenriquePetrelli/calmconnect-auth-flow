/**
 * WebRTC State Machine - Prevents invalid state transitions
 */
export type WebRTCState = 'idle' | 'initializing' | 'connected' | 'cleaning' | 'error';

export class WebRTCStateMachine {
  private state: WebRTCState = 'idle';
  private sessionId: string;
  
  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  private readonly validTransitions: Record<WebRTCState, WebRTCState[]> = {
    idle: ['initializing'],
    initializing: ['connected', 'error', 'cleaning'],
    connected: ['cleaning', 'error'],
    cleaning: ['idle', 'error'],
    error: ['idle', 'cleaning']
  };

  getCurrentState(): WebRTCState {
    return this.state;
  }

  canTransitionTo(newState: WebRTCState): boolean {
    return this.validTransitions[this.state].includes(newState);
  }

  transitionTo(newState: WebRTCState): boolean {
    if (!this.canTransitionTo(newState)) {
      console.warn(`❌ Invalid transition from ${this.state} to ${newState} for session ${this.sessionId}`);
      return false;
    }
    
    const previousState = this.state;
    this.state = newState;
    console.log(`🔄 State transition: ${previousState} → ${newState} (session: ${this.sessionId.substring(0, 8)}...)`);
    return true;
  }

  forceReset(): void {
    console.log(`🔄 Force reset state machine for session ${this.sessionId.substring(0, 8)}...`);
    this.state = 'idle';
  }

  isInValidState(): boolean {
    const validStates: WebRTCState[] = ['idle', 'initializing', 'connected', 'cleaning', 'error'];
    return validStates.includes(this.state);
  }
}

// Global state machine registry
class StateMachineRegistry {
  private static instance: StateMachineRegistry;
  private machines: Map<string, WebRTCStateMachine> = new Map();
  
  static getInstance(): StateMachineRegistry {
    if (!StateMachineRegistry.instance) {
      StateMachineRegistry.instance = new StateMachineRegistry();
    }
    return StateMachineRegistry.instance;
  }

  getOrCreate(sessionId: string): WebRTCStateMachine {
    if (!this.machines.has(sessionId)) {
      this.machines.set(sessionId, new WebRTCStateMachine(sessionId));
    }
    return this.machines.get(sessionId)!;
  }

  remove(sessionId: string): void {
    this.machines.delete(sessionId);
  }

  resetAll(): void {
    console.log(`🔄 Resetting all state machines (${this.machines.size} active)`);
    for (const machine of this.machines.values()) {
      machine.forceReset();
    }
  }

  cleanup(): void {
    this.machines.clear();
  }

  getStats(): { total: number; byState: Record<WebRTCState, number> } {
    const byState: Record<WebRTCState, number> = {
      idle: 0,
      initializing: 0,
      connected: 0,
      cleaning: 0,
      error: 0
    };

    for (const machine of this.machines.values()) {
      byState[machine.getCurrentState()]++;
    }

    return {
      total: this.machines.size,
      byState
    };
  }
}

export const stateMachineRegistry = StateMachineRegistry.getInstance();