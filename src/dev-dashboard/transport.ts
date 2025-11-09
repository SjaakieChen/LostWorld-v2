import { DASHBOARD_CHANNEL_NAME, type DashboardMessage } from './messages'

export interface DashboardTransport {
  publish(message: DashboardMessage): void
  isAvailable(): boolean
  close(): void
}

export interface BroadcastChannelTransportOptions {
  channelName?: string
  devOnly?: boolean
  onError?: (error: unknown) => void
}

export class BroadcastChannelTransport implements DashboardTransport {
  private channel: BroadcastChannel | null = null
  private readonly options: BroadcastChannelTransportOptions

  constructor(options: BroadcastChannelTransportOptions = {}) {
    this.options = options

    const shouldInit = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
    const allowEnv = options.devOnly === false || import.meta.env.DEV

    if (shouldInit && allowEnv) {
      try {
        this.channel = new BroadcastChannel(options.channelName ?? DASHBOARD_CHANNEL_NAME)
      } catch (error) {
        this.channel = null
        this.options.onError?.(error)
      }
    }
  }

  publish(message: DashboardMessage): void {
    if (!this.channel) {
      return
    }

    try {
      this.channel.postMessage(message)
    } catch (error) {
      this.options.onError?.(error)
    }
  }

  isAvailable(): boolean {
    return this.channel !== null
  }

  close(): void {
    this.channel?.close()
    this.channel = null
  }
}

export class MemoryTransport implements DashboardTransport {
  readonly messages: DashboardMessage[] = []

  publish(message: DashboardMessage): void {
    this.messages.push(message)
  }

  isAvailable(): boolean {
    return true
  }

  close(): void {
    // no-op
  }
}

