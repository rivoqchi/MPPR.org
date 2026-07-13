import { io, type Socket } from 'socket.io-client'

function getSocketUrl(): string {
  const url = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000'
  return url.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:')
}

class SocketService {
  private socket: Socket | null = null

  connect(token: string): Socket {
    if (this.socket) {
      this.socket.auth = { token }
      if (!this.socket.active) {
        this.socket.connect()
      }
      return this.socket
    }

    this.socket = io(getSocketUrl(), {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1_000,
      transports: ['websocket', 'polling'],
      auth: { token },
      query: { token },
    })

    return this.socket
  }

  disconnect(): void {
    if (!this.socket) {
      return
    }

    this.socket.removeAllListeners()
    this.socket.disconnect()
    this.socket = null
  }

  get instance(): Socket | null {
    return this.socket
  }
}

export const socketService = new SocketService()
