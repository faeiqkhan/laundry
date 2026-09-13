// In-memory connection state, shared between the client lifecycle and the HTTP routes.
// The frontend never sees whatsapp-web.js objects - only these normalized values.

export const State = Object.freeze({
  DISCONNECTED: "DISCONNECTED",
  CONNECTING: "CONNECTING",
  QR_REQUIRED: "QR_REQUIRED",
  AUTHENTICATED: "AUTHENTICATED",
  READY: "READY",
  AUTH_FAILURE: "AUTH_FAILURE",
  LOGGED_OUT: "LOGGED_OUT",
  ERROR: "ERROR",
});

const state = {
  status: State.DISCONNECTED,
  qrDataUrl: null,
  businessNumber: null,
  lastConnectedAt: null,
  message: null,
  initialized: false,
};

export function setStatus(value, message) {
  state.status = value;
  if (message) state.message = message;
  if (value === State.READY) state.lastConnectedAt = new Date().toISOString();
  if (value !== State.READY && value !== State.AUTHENTICATED && value !== State.QR_REQUIRED) {
    state.businessNumber = state.businessNumber ?? null;
  }
}

export function setQr(dataUrl) {
  state.qrDataUrl = dataUrl;
  if (dataUrl) state.status = State.QR_REQUIRED;
}

export function clearQr() {
  state.qrDataUrl = null;
}

export function setBusinessNumber(number) {
  state.businessNumber = number || null;
}

export function setInitialized(value) {
  state.initialized = value;
}

export function isInitialized() {
  return state.initialized;
}

export function snapshot() {
  return {
    status: state.status,
    connected: state.status === State.READY,
    qrDataUrl: state.qrDataUrl,
    businessNumber: state.businessNumber,
    lastConnectedAt: state.lastConnectedAt,
    message: state.message,
  };
}

export function reset() {
  state.status = State.DISCONNECTED;
  state.qrDataUrl = null;
  state.businessNumber = null;
  state.message = null;
  state.initialized = false;
}