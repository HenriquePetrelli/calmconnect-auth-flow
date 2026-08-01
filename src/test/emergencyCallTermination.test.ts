import { describe, it, expect, beforeEach } from "vitest";
import {
  isRealTermination,
  isStaleCompletedSession,
  getTerminationMessage,
  type TerminationSessionLike,
  type CallUserType,
} from "@/lib/callTermination";

/**
 * Integration-style simulation of the emergency (SOS) call flow.
 *
 * FakeSessionServer mimics the `webrtc_sessions` row + realtime broadcast,
 * and CallClient mimics what the app does on join / unmount (navigation,
 * app close) and on explicit "encerrar chamada".
 */

interface SessionRow extends TerminationSessionLike {
  id: string;
}

class FakeSessionServer {
  row: SessionRow;
  private listeners = new Map<string, (row: SessionRow) => void>();

  constructor(id = "session-1") {
    this.row = { id, status: "active", ended_at: null, ended_by: null, ended_by_type: null };
  }

  subscribe(clientId: string, cb: (row: SessionRow) => void) {
    this.listeners.set(clientId, cb);
  }

  unsubscribe(clientId: string) {
    this.listeners.delete(clientId);
  }

  update(patch: Partial<SessionRow>) {
    this.row = { ...this.row, ...patch };
    for (const cb of this.listeners.values()) cb({ ...this.row });
  }
}

let clock = 1_000_000;
const now = () => (clock += 1000);

class CallClient {
  readonly userType: CallUserType;
  private server: FakeSessionServer;
  private id: string;
  joinedAt = 0;
  mounted = false;
  terminationMessage: string | null = null;

  constructor(server: FakeSessionServer, userType: CallUserType) {
    this.server = server;
    this.userType = userType;
    this.id = `${userType}-client`;
  }

  /** Entering the call screen (first time, after navigation or after reconnect). */
  join() {
    this.joinedAt = now();
    this.mounted = true;
    this.terminationMessage = null;

    // Reopen stale "completed" rows from previous calls (same as useWebRTC).
    if (isStaleCompletedSession(this.server.row, this.joinedAt)) {
      this.server.update({
        status: "active",
        ended_at: null,
        ended_by: null,
        ended_by_type: null,
      });
    }

    this.server.subscribe(this.id, (row) => {
      if (!this.mounted) return;
      if (isRealTermination(row, this.joinedAt)) {
        this.terminationMessage = getTerminationMessage(row.ended_by_type);
      }
    });
  }

  /** Navigating away, closing the tab or losing the connection: no DB write. */
  leaveWithoutEnding() {
    this.mounted = false;
    this.server.unsubscribe(this.id);
  }

  /** Explicit "encerrar chamada" with a reason. */
  endCall(reason = "consulta_finalizada") {
    this.server.update({
      status: "completed",
      ended_by: `${this.userType}-user-id`,
      ended_by_type: this.userType,
      ended_at: new Date(now()).toISOString(),
      end_reason: reason,
    } as Partial<SessionRow>);
  }
}

describe("emergency call termination notice", () => {
  let server: FakeSessionServer;
  let patient: CallClient;
  let psychologist: CallClient;

  beforeEach(() => {
    server = new FakeSessionServer();
    patient = new CallClient(server, "patient");
    psychologist = new CallClient(server, "psychologist");
    patient.join();
    psychologist.join();
  });

  it("does not warn while the call is simply running", () => {
    server.update({ patient_muted: true } as any);
    expect(patient.terminationMessage).toBeNull();
    expect(psychologist.terminationMessage).toBeNull();
  });

  it("does not warn when the patient closes the app without ending the call", () => {
    patient.leaveWithoutEnding();
    expect(psychologist.terminationMessage).toBeNull();
    expect(server.row.status).toBe("active");
  });

  it("does not warn when the psychologist closes the app without ending the call", () => {
    psychologist.leaveWithoutEnding();
    expect(patient.terminationMessage).toBeNull();
    expect(server.row.status).toBe("active");
  });

  it("does not warn when a participant navigates away and comes back", () => {
    patient.leaveWithoutEnding();
    patient.join();
    expect(patient.terminationMessage).toBeNull();
    expect(psychologist.terminationMessage).toBeNull();
  });

  it("does not replay a stale termination from a previous call on rejoin", () => {
    // Previous call was properly finished.
    psychologist.endCall();
    expect(patient.terminationMessage).toBe("O psicólogo encerrou a chamada de vídeo.");

    patient.leaveWithoutEnding();
    psychologist.leaveWithoutEnding();

    // Both re-enter a new call on the same room/session row.
    patient.join();
    psychologist.join();

    expect(server.row.status).toBe("active");
    expect(patient.terminationMessage).toBeNull();
    expect(psychologist.terminationMessage).toBeNull();
  });

  it("does not warn on reconnection after an involuntary drop", () => {
    // Simulated network drop: unsubscribe, then rejoin without any DB write.
    psychologist.leaveWithoutEnding();
    psychologist.join();
    server.update({ psychologist_camera_off: true } as any);

    expect(psychologist.terminationMessage).toBeNull();
    expect(patient.terminationMessage).toBeNull();
  });

  it("warns the patient when the psychologist really ends the call", () => {
    psychologist.endCall();
    expect(patient.terminationMessage).toBe("O psicólogo encerrou a chamada de vídeo.");
  });

  it("warns the psychologist when the patient really ends the call", () => {
    patient.endCall();
    expect(psychologist.terminationMessage).toBe("O paciente encerrou a chamada de vídeo.");
  });

  it("warns the remaining participant even if the other left and returned before ending", () => {
    patient.leaveWithoutEnding();
    patient.join();
    patient.endCall();
    expect(psychologist.terminationMessage).toBe("O paciente encerrou a chamada de vídeo.");
  });

  it("ignores completed rows without ended_by metadata", () => {
    server.update({ status: "completed", ended_at: new Date(now()).toISOString() });
    expect(patient.terminationMessage).toBeNull();
    expect(psychologist.terminationMessage).toBeNull();
  });
});

describe("isRealTermination", () => {
  const joinedAt = 5_000;

  it("is false for active sessions", () => {
    expect(isRealTermination({ status: "active" }, joinedAt)).toBe(false);
  });

  it("is false for terminations that happened before we joined", () => {
    expect(
      isRealTermination(
        {
          status: "completed",
          ended_by: "u1",
          ended_by_type: "patient",
          ended_at: new Date(1_000).toISOString(),
        },
        joinedAt
      )
    ).toBe(false);
  });

  it("is true for terminations after we joined", () => {
    expect(
      isRealTermination(
        {
          status: "completed",
          ended_by: "u1",
          ended_by_type: "psychologist",
          ended_at: new Date(9_000).toISOString(),
        },
        joinedAt
      )
    ).toBe(true);
  });

  it("flags stale completed rows for reopening", () => {
    expect(
      isStaleCompletedSession(
        { status: "completed", ended_by: "u1", ended_by_type: "patient", ended_at: new Date(1_000).toISOString() },
        joinedAt
      )
    ).toBe(true);
  });
});
