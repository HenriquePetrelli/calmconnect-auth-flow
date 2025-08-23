import { supabase } from '@/integrations/supabase/client';

export interface WebRTCSessionConfig {
  sessionId: string;
  stunServers: string[];
  emergencyRequestId?: string;
  timeLimit: number; // in seconds
}

export interface SessionParticipant {
  id: string;
  type: 'psychologist' | 'patient';
  name?: string;
  isOnline: boolean;
}

// Singleton WebRTC Connection Manager
class WebRTCConnectionManager {
  private static instance: WebRTCConnectionManager;
  private activeConnections: Map<string, RTCPeerConnection> = new Map();
  private initializingConnections: Set<string> = new Set();
  private connectionQueues: Map<string, Promise<RTCPeerConnection>> = new Map();
  private lastCleanup: number = 0;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CONNECTIONS = 5; // Browser limit safety

  static getInstance(): WebRTCConnectionManager {
    if (!WebRTCConnectionManager.instance) {
      WebRTCConnectionManager.instance = new WebRTCConnectionManager();
    }
    return WebRTCConnectionManager.instance;
  }

  private constructor() {
    // Auto cleanup old connections periodically
    setInterval(() => {
      this.cleanupOldConnections();
    }, 30 * 1000); // Every 30 seconds
  }

  async getConnection(sessionId: string, config?: RTCConfiguration): Promise<RTCPeerConnection> {
    // Check if connection already exists and is usable
    const existing = this.activeConnections.get(sessionId);
    if (existing && this.isConnectionUsable(existing)) {
      console.log(`♻️ Reusing existing connection for session: ${sessionId}`);
      return existing;
    }

    // If already initializing, wait for that process
    if (this.connectionQueues.has(sessionId)) {
      console.log(`⏳ Waiting for existing initialization of session: ${sessionId}`);
      return this.connectionQueues.get(sessionId)!;
    }

    // Prevent too many connections
    if (this.activeConnections.size >= this.MAX_CONNECTIONS) {
      console.log('⚠️ Too many connections, cleaning up old ones...');
      this.cleanupOldConnections(2 * 60 * 1000); // Cleanup connections older than 2 minutes
    }

    // Create new connection with queuing
    const connectionPromise = this.createNewConnection(sessionId, config);
    this.connectionQueues.set(sessionId, connectionPromise);

    try {
      const connection = await connectionPromise;
      return connection;
    } finally {
      this.connectionQueues.delete(sessionId);
    }
  }

  private async createNewConnection(sessionId: string, config?: RTCConfiguration): Promise<RTCPeerConnection> {
    console.log(`🔗 Creating new WebRTC connection for session: ${sessionId}`);
    
    // Mark as initializing
    this.initializingConnections.add(sessionId);

    try {
      // Clean up any existing connection for this session
      await this.cleanupConnection(sessionId);

      const defaultConfig: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      };

      const connection = new RTCPeerConnection(config || defaultConfig);
      
      // Set up connection monitoring
      this.setupConnectionMonitoring(connection, sessionId);
      
      // Store the connection
      this.activeConnections.set(sessionId, connection);
      
      console.log(`✅ WebRTC connection created successfully for session: ${sessionId}`);
      console.log(`📊 Active connections: ${this.activeConnections.size}/${this.MAX_CONNECTIONS}`);
      
      return connection;
    } catch (error) {
      console.error(`❌ Failed to create WebRTC connection for session ${sessionId}:`, error);
      
      // Handle specific "too many connections" error
      if (error instanceof Error && error.message.includes('Cannot create so many PeerConnections')) {
        console.log('🚨 Too many PeerConnections error - forcing cleanup');
        this.forceCleanupAllConnections();
        
        // Wait a bit and retry once
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const retryConnection = new RTCPeerConnection(config || {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
          });
          this.setupConnectionMonitoring(retryConnection, sessionId);
          this.activeConnections.set(sessionId, retryConnection);
          return retryConnection;
        } catch (retryError) {
          throw new Error('WEBRTC_TOO_MANY_CONNECTIONS: Falha ao criar conexão após limpeza. Recarregue a página.');
        }
      }
      
      throw error;
    } finally {
      this.initializingConnections.delete(sessionId);
    }
  }

  private setupConnectionMonitoring(connection: RTCPeerConnection, sessionId: string) {
    connection.onconnectionstatechange = () => {
      const state = connection.connectionState;
      console.log(`🔄 Connection ${sessionId} state: ${state}`);
      
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        // Auto cleanup failed connections
        setTimeout(() => {
          if (this.activeConnections.get(sessionId) === connection) {
            this.cleanupConnection(sessionId);
          }
        }, 5000); // 5 second delay
      }
    };

    connection.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE connection ${sessionId} state: ${connection.iceConnectionState}`);
    };
  }

  private isConnectionUsable(connection: RTCPeerConnection): boolean {
    const usableStates: RTCPeerConnectionState[] = ['new', 'connecting', 'connected'];
    return usableStates.includes(connection.connectionState);
  }

  async cleanupConnection(sessionId: string): Promise<void> {
    const connection = this.activeConnections.get(sessionId);
    if (connection) {
      console.log(`🧹 Cleaning up connection for session: ${sessionId}`);
      
      try {
        // Stop all senders
        connection.getSenders().forEach(sender => {
          if (sender.track) {
            sender.track.stop();
          }
        });

        // Close connection
        if (connection.connectionState !== 'closed') {
          connection.close();
        }
      } catch (error) {
        console.warn(`⚠️ Error during connection cleanup for ${sessionId}:`, error);
      }

      this.activeConnections.delete(sessionId);
      console.log(`✅ Connection cleaned up for session: ${sessionId}`);
    }
  }

  private cleanupOldConnections(maxAge: number = this.CLEANUP_INTERVAL): void {
    const now = Date.now();
    
    // Prevent too frequent cleanups
    if (now - this.lastCleanup < 30000) return; // 30 seconds
    
    this.lastCleanup = now;

    console.log(`🧹 Running cleanup of old connections (max age: ${maxAge}ms)`);
    
    for (const [sessionId, connection] of this.activeConnections.entries()) {
      const shouldCleanup = 
        connection.connectionState === 'closed' ||
        connection.connectionState === 'failed' ||
        connection.connectionState === 'disconnected';

      if (shouldCleanup) {
        console.log(`🗑️ Cleaning up stale connection: ${sessionId} (state: ${connection.connectionState})`);
        this.cleanupConnection(sessionId);
      }
    }
  }

  forceCleanupAllConnections(): void {
    console.log('🚨 Force cleaning up ALL WebRTC connections');
    
    for (const [sessionId] of this.activeConnections.entries()) {
      this.cleanupConnection(sessionId);
    }

    // Clear all maps
    this.activeConnections.clear();
    this.initializingConnections.clear();
    this.connectionQueues.clear();
    
    console.log('✅ All WebRTC connections force cleaned');
  }

  hasConnection(sessionId: string): boolean {
    return this.activeConnections.has(sessionId);
  }

  getConnectionState(sessionId: string): RTCPeerConnectionState | null {
    const connection = this.activeConnections.get(sessionId);
    return connection ? connection.connectionState : null;
  }

  getStats(): { active: number; initializing: number; queued: number } {
    return {
      active: this.activeConnections.size,
      initializing: this.initializingConnections.size,
      queued: this.connectionQueues.size
    };
  }
}

export class WebRTCManager {
  private sessionId: string;
  private config: WebRTCSessionConfig;
  private onStatusChange?: (status: string) => void;
  private onParticipantChange?: (participants: SessionParticipant[]) => void;
  private realtimeChannel: any;
  private connectionManager: WebRTCConnectionManager;

  constructor(sessionId: string, config: WebRTCSessionConfig) {
    this.sessionId = sessionId;
    this.config = config;
    this.connectionManager = WebRTCConnectionManager.getInstance();
  }

  async fetchSessionConfig(): Promise<WebRTCSessionConfig | null> {
    try {
      console.log(`🔍 Fetching session config for: ${this.sessionId}`);
      
      // Use maybeSingle to prevent PGRST116 errors
      const { data: session, error } = await supabase
        .from('webrtc_sessions')
        .select(`
          id,
          emergency_request_id,
          status,
          expires_at,
          psychologist_id,
          patient_id
        `)
        .eq('id', this.sessionId)
        .maybeSingle(); // Returns null instead of throwing when no rows found

      if (error) {
        console.error('❌ Database error fetching session:', error);
        return null;
      }

      // Session not found
      if (!session) {
        console.warn(`⚠️ Session not found: ${this.sessionId}`);
        return null;
      }

      // Check if session is expired
      if (session.expires_at && new Date(session.expires_at) < new Date()) {
        console.warn(`⏰ Session expired: ${this.sessionId}`);
        return null;
      }

      console.log('✅ Session config fetched successfully');
      
      return {
        sessionId: session.id,
        stunServers: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302'
        ],
        emergencyRequestId: session.emergency_request_id,
        timeLimit: 1200 // 20 minutes default
      };
    } catch (error) {
      console.error('❌ Unexpected error in fetchSessionConfig:', error);
      return null;
    }
  }

  setupRealtimeSubscription(callbacks: {
    onStatusChange?: (status: string) => void;
    onParticipantChange?: (participants: SessionParticipant[]) => void;
  }) {
    this.onStatusChange = callbacks.onStatusChange;
    this.onParticipantChange = callbacks.onParticipantChange;

    console.log(`🔔 Setting up realtime subscription for session: ${this.sessionId}`);

    this.realtimeChannel = supabase
      .channel(`webrtc_manager_${this.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'webrtc_sessions',
          filter: `id=eq.${this.sessionId}`
        },
        (payload) => {
          console.log('📡 Session update received:', payload);
          const newStatus = payload.new.status;
          this.onStatusChange?.(newStatus);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_requests',
          filter: `id=eq.${this.config.emergencyRequestId}`
        },
        (payload) => {
          console.log('🚨 Emergency request update:', payload);
          // Handle emergency request updates if needed
        }
      )
      .subscribe((status) => {
        console.log(`📡 Subscription status: ${status}`);
      });

    return this.realtimeChannel;
  }

  async updateSessionStatus(status: 'active' | 'completed' | 'failed'): Promise<boolean> {
    try {
      console.log(`📝 Updating session status to: ${status}`);
      
      const { error } = await supabase
        .from('webrtc_sessions')
        .update({ 
          status,
          ...(status === 'completed' && { ended_at: new Date().toISOString() })
        })
        .eq('id', this.sessionId);

      if (error) throw error;
      
      console.log('✅ Session status updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error updating session status:', error);
      return false;
    }
  }

  async getParticipants(): Promise<SessionParticipant[]> {
    try {
      const { data: session, error } = await supabase
        .from('webrtc_sessions')
        .select(`
          psychologist_id,
          patient_id,
          emergency_requests (
            patient_details
          )
        `)
        .eq('id', this.sessionId)
        .single();

      if (error) throw error;

      const participants: SessionParticipant[] = [];

      if (session.psychologist_id) {
        participants.push({
          id: session.psychologist_id,
          type: 'psychologist',
          isOnline: true // We'll need to implement presence tracking
        });
      }

      if (session.patient_id) {
        const patientDetails = session.emergency_requests?.patient_details as any;
        participants.push({
          id: session.patient_id,
          type: 'patient',
          name: patientDetails?.name,
          isOnline: true
        });
      }

      return participants;
    } catch (error) {
      console.error('❌ Error fetching participants:', error);
      return [];
    }
  }

  async logConnectionStats(stats: RTCStatsReport): Promise<void> {
    try {
      const connectionStats = {
        timestamp: new Date().toISOString(),
        session_id: this.sessionId,
        stats: this.processRTCStats(stats)
      };

      console.log('📊 Connection stats:', connectionStats);
      
      // You could store these in a separate analytics table
      // await supabase.from('webrtc_stats').insert(connectionStats);
    } catch (error) {
      console.error('❌ Error logging connection stats:', error);
    }
  }

  private processRTCStats(stats: RTCStatsReport): any {
    const processed: any = {
      audio: {},
      video: {},
      connection: {}
    };

    stats.forEach((report) => {
      switch (report.type) {
        case 'inbound-rtp':
          if (report.kind === 'audio') {
            processed.audio.inbound = {
              packetsReceived: report.packetsReceived,
              bytesReceived: report.bytesReceived,
              jitter: report.jitter
            };
          } else if (report.kind === 'video') {
            processed.video.inbound = {
              packetsReceived: report.packetsReceived,
              bytesReceived: report.bytesReceived,
              framesReceived: report.framesReceived
            };
          }
          break;
        case 'outbound-rtp':
          if (report.kind === 'audio') {
            processed.audio.outbound = {
              packetsSent: report.packetsSent,
              bytesSent: report.bytesSent
            };
          } else if (report.kind === 'video') {
            processed.video.outbound = {
              packetsSent: report.packetsSent,
              bytesSent: report.bytesSent,
              framesSent: report.framesSent
            };
          }
          break;
        case 'candidate-pair':
          if (report.state === 'succeeded') {
            processed.connection = {
              currentRoundTripTime: report.currentRoundTripTime,
              availableOutgoingBitrate: report.availableOutgoingBitrate,
              availableIncomingBitrate: report.availableIncomingBitrate
            };
          }
          break;
      }
    });

    return processed;
  }

  async simulateNetworkConditions(condition: 'good' | 'poor' | 'unstable'): Promise<void> {
    // This would be used in development/testing to simulate different network conditions
    console.log(`🌐 Simulating network condition: ${condition}`);
    
    const conditions = {
      good: { latency: 50, packetLoss: 0 },
      poor: { latency: 300, packetLoss: 0.05 },
      unstable: { latency: 150, packetLoss: 0.02 }
    };

    const selected = conditions[condition];
    console.log(`📊 Network simulation - Latency: ${selected.latency}ms, Loss: ${selected.packetLoss * 100}%`);
  }

  // New method to get managed connection
  async getManagedConnection(config?: RTCConfiguration): Promise<RTCPeerConnection> {
    try {
      return await this.connectionManager.getConnection(this.sessionId, config);
    } catch (error) {
      if (error instanceof Error && error.message.includes('WEBRTC_TOO_MANY_CONNECTIONS')) {
        throw new Error('Muitas conexões ativas. Recarregue a página e tente novamente.');
      }
      throw error;
    }
  }

  // Get connection stats from manager
  getConnectionStats(): { active: number; initializing: number; queued: number } {
    return this.connectionManager.getStats();
  }

  cleanup(): void {
    console.log('🧹 Cleaning up WebRTC Manager...');
    
    // Clean up this specific session
    this.connectionManager.cleanupConnection(this.sessionId);
    
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    
    this.onStatusChange = undefined;
    this.onParticipantChange = undefined;
  }
}

// Export singleton manager instance
export const getWebRTCConnectionManager = () => WebRTCConnectionManager.getInstance();

export default WebRTCManager;