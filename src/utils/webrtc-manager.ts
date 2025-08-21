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

export class WebRTCManager {
  private sessionId: string;
  private config: WebRTCSessionConfig;
  private onStatusChange?: (status: string) => void;
  private onParticipantChange?: (participants: SessionParticipant[]) => void;
  private realtimeChannel: any;

  constructor(sessionId: string, config: WebRTCSessionConfig) {
    this.sessionId = sessionId;
    this.config = config;
  }

  async fetchSessionConfig(): Promise<WebRTCSessionConfig | null> {
    try {
      console.log(`🔍 Fetching session config for: ${this.sessionId}`);
      
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
        .single();

      if (error) {
        console.error('❌ Error fetching session:', error);
        return null;
      }

      // Check if session is expired
      if (session.expires_at && new Date(session.expires_at) < new Date()) {
        console.warn('⏰ Session expired');
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
      console.error('❌ Error in fetchSessionConfig:', error);
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

  cleanup(): void {
    console.log('🧹 Cleaning up WebRTC Manager...');
    
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    
    this.onStatusChange = undefined;
    this.onParticipantChange = undefined;
  }
}

export default WebRTCManager;