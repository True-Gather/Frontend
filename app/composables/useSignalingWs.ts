// WebSocket Signaling Composable with Mock Support
import type {
    SignalingMessage,
    JoinRoomPayload,
    PublishOfferPayload,
    TrickleIcePayload,
    SubscribePayload,
    SubscribeAnswerPayload,
    JoinedPayload,
    PublisherJoinedPayload,
    PublisherLeftPayload,
    PublishAnswerPayload,
    SubscribeOfferPayload,
    RemoteCandidatePayload,
    ErrorPayload,
    ServerMessage
} from '~/types'

type MessageHandler = (message: ServerMessage) => void

interface PendingRequest {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
    timeout: ReturnType<typeof setTimeout>
}

export function useSignalingWs() {
    // State
    const ws = ref<WebSocket | null>(null)
    const isConnected = ref(false)
    const isConnecting = ref(false)
    const connectionError = ref<string | null>(null)

    // Internal state
    const pendingRequests = new Map<string, PendingRequest>()
    const messageHandlers = new Map<string, Set<MessageHandler>>()
    const REQUEST_TIMEOUT = 30000

    // Reconnection state
    let reconnectAttempts = 0
    const MAX_RECONNECT_ATTEMPTS = 5
    const INITIAL_BACKOFF = 1000
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null

    // Mock mode state
    let mockMode = true
    const mockPublishers = new Map<number, { display: string; user_id: string }>()
    let mockFeedIdCounter = 1

    /**
     * Generate unique request ID
     */
    function generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * Connect to WebSocket server
     */
    async function connect(wsUrl: string): Promise<void> {
        if (isConnected.value || isConnecting.value) {
            return
        }

        // Check if we should use mock mode
        mockMode = wsUrl.includes('localhost') || wsUrl.includes('mock')

        if (mockMode) {
            console.log('[SignalingWS] Using mock mode')
            isConnected.value = true
            isConnecting.value = false
            reconnectAttempts = 0
            return
        }

        isConnecting.value = true
        connectionError.value = null

        return new Promise((resolve, reject) => {
            try {
                ws.value = new WebSocket(wsUrl)

                ws.value.onopen = () => {
                    console.log('[SignalingWS] Connected')
                    isConnected.value = true
                    isConnecting.value = false
                    reconnectAttempts = 0
                    resolve()
                }

                ws.value.onclose = (event) => {
                    console.log('[SignalingWS] Disconnected:', event.code, event.reason)
                    isConnected.value = false
                    isConnecting.value = false

                    // Attempt reconnect if not intentional close
                    if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                        scheduleReconnect(wsUrl)
                    }
                }

                ws.value.onerror = (error) => {
                    console.error('[SignalingWS] Error:', error)
                    connectionError.value = 'WebSocket connection failed'
                    isConnecting.value = false
                    reject(new Error('WebSocket connection failed'))
                }

                ws.value.onmessage = (event) => {
                    handleMessage(event.data)
                }
            } catch (error) {
                isConnecting.value = false
                reject(error)
            }
        })
    }

    /**
     * Schedule reconnection with exponential backoff
     */
    function scheduleReconnect(wsUrl: string) {
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout)
        }

        const backoff = Math.min(INITIAL_BACKOFF * Math.pow(2, reconnectAttempts), 30000)
        reconnectAttempts++

        console.log(`[SignalingWS] Reconnecting in ${backoff}ms (attempt ${reconnectAttempts})`)

        reconnectTimeout = setTimeout(() => {
            connect(wsUrl)
        }, backoff)
    }

    /**
     * Handle incoming messages
     */
    function handleMessage(data: string) {
        try {
            const message = JSON.parse(data) as ServerMessage

            // Handle request/response correlation
            if (message.request_id && pendingRequests.has(message.request_id)) {
                const pending = pendingRequests.get(message.request_id)!
                clearTimeout(pending.timeout)
                pendingRequests.delete(message.request_id)

                if (message.type === 'error') {
                    pending.reject(new Error((message.payload as ErrorPayload).message))
                } else {
                    pending.resolve(message)
                }
                return
            }

            // Notify event handlers
            const handlers = messageHandlers.get(message.type)
            if (handlers) {
                handlers.forEach(handler => handler(message))
            }

            // Also notify wildcard handlers
            const wildcardHandlers = messageHandlers.get('*')
            if (wildcardHandlers) {
                wildcardHandlers.forEach(handler => handler(message))
            }
        } catch (error) {
            console.error('[SignalingWS] Failed to parse message:', error)
        }
    }

    /**
     * Send a message and wait for response
     */
    async function sendRequest<T>(type: string, payload: unknown): Promise<T> {
        const requestId = generateRequestId()

        // Mock mode handling
        if (mockMode) {
            return handleMockRequest<T>(type, payload, requestId)
        }

        if (!ws.value || !isConnected.value) {
            throw new Error('WebSocket not connected')
        }

        const message: SignalingMessage = {
            type,
            request_id: requestId,
            payload
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                pendingRequests.delete(requestId)
                reject(new Error(`Request ${type} timed out`))
            }, REQUEST_TIMEOUT)

            pendingRequests.set(requestId, { resolve: resolve as (value: unknown) => void, reject, timeout })

            ws.value!.send(JSON.stringify(message))
        })
    }

    /**
     * Handle mock requests
     */
    async function handleMockRequest<T>(type: string, payload: unknown, requestId: string): Promise<T> {
        await new Promise(resolve => setTimeout(resolve, 100))

        switch (type) {
            case 'join_room': {
                const p = payload as JoinRoomPayload
                const response: SignalingMessage<JoinedPayload> & { type: 'joined' } = {
                    type: 'joined',
                    request_id: requestId,
                    payload: {
                        room_id: p.room_id,
                        user_id: `user_${Date.now()}`,
                        existing_publishers: Array.from(mockPublishers.entries()).map(([feed_id, data]) => ({
                            feed_id,
                            display: data.display,
                            user_id: data.user_id
                        }))
                    }
                }
                return response as T
            }

            case 'publish_offer': {
                // Create a mock SDP answer
                const response: SignalingMessage<PublishAnswerPayload> & { type: 'publish_answer' } = {
                    type: 'publish_answer',
                    request_id: requestId,
                    payload: {
                        sdp: createMockSdpAnswer()
                    }
                }

                // Simulate publisher joined event for other participants
                const feedId = mockFeedIdCounter++
                mockPublishers.set(feedId, { display: 'Local User', user_id: `user_${Date.now()}` })

                return response as T
            }

            case 'subscribe': {
                const response: SignalingMessage<SubscribeOfferPayload> & { type: 'subscribe_offer' } = {
                    type: 'subscribe_offer',
                    request_id: requestId,
                    payload: {
                        sdp: createMockSdpOffer(),
                        feed_ids: (payload as SubscribePayload).feeds.map(f => f.feed_id)
                    }
                }
                return response as T
            }

            case 'leave': {
                return { type: 'left', payload: { success: true } } as T
            }

            case 'ping': {
                return { type: 'pong', payload: {} } as T
            }

            default:
                throw new Error(`Unknown message type: ${type}`)
        }
    }

    /**
     * Create mock SDP answer
     */
    function createMockSdpAnswer(): string {
        return `v=0
o=- ${Date.now()} 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0 1
a=msid-semantic: WMS
m=audio 9 UDP/TLS/RTP/SAVPF 111
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:mock
a=ice-pwd:mockmockmockmockmock
a=fingerprint:sha-256 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00
a=setup:active
a=mid:0
a=recvonly
a=rtcp-mux
a=rtpmap:111 opus/48000/2
m=video 9 UDP/TLS/RTP/SAVPF 96
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:mock
a=ice-pwd:mockmockmockmockmock
a=fingerprint:sha-256 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00
a=setup:active
a=mid:1
a=recvonly
a=rtcp-mux
a=rtpmap:96 VP8/90000`
    }

    /**
     * Create mock SDP offer
     */
    function createMockSdpOffer(): string {
        return createMockSdpAnswer().replace('recvonly', 'sendonly')
    }

    /**
     * Send a message without waiting for response
     */
    function send(type: string, payload: unknown): void {
        if (mockMode) {
            console.log('[SignalingWS Mock] Send:', type, payload)
            return
        }

        if (!ws.value || !isConnected.value) {
            throw new Error('WebSocket not connected')
        }

        const message: SignalingMessage = {
            type,
            payload
        }

        ws.value.send(JSON.stringify(message))
    }

    /**
     * Add event listener for specific message type
     */
    function on(type: string, handler: MessageHandler): void {
        if (!messageHandlers.has(type)) {
            messageHandlers.set(type, new Set())
        }
        messageHandlers.get(type)!.add(handler)
    }

    /**
     * Remove event listener
     */
    function off(type: string, handler: MessageHandler): void {
        const handlers = messageHandlers.get(type)
        if (handlers) {
            handlers.delete(handler)
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    function disconnect(): void {
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout)
            reconnectTimeout = null
        }

        if (mockMode) {
            isConnected.value = false
            mockPublishers.clear()
            return
        }

        if (ws.value) {
            ws.value.close(1000, 'Client disconnect')
            ws.value = null
        }

        isConnected.value = false

        // Reject all pending requests
        pendingRequests.forEach((pending) => {
            clearTimeout(pending.timeout)
            pending.reject(new Error('WebSocket disconnected'))
        })
        pendingRequests.clear()
    }

    /**
     * Simulate a remote publisher joining (mock only)
     */
    function simulatePublisherJoined(display: string): void {
        if (!mockMode) return

        const feedId = mockFeedIdCounter++
        const userId = `user_${Date.now()}`
        mockPublishers.set(feedId, { display, user_id: userId })

        const message: SignalingMessage<PublisherJoinedPayload> & { type: 'publisher_joined' } = {
            type: 'publisher_joined',
            payload: {
                feed_id: feedId,
                display,
                room_id: 'mock-room',
                user_id: userId
            }
        }

        const handlers = messageHandlers.get('publisher_joined')
        if (handlers) {
            handlers.forEach(handler => handler(message))
        }
    }

    return {
        // State
        isConnected: readonly(isConnected),
        isConnecting: readonly(isConnecting),
        connectionError: readonly(connectionError),

        // Methods
        connect,
        disconnect,
        sendRequest,
        send,
        on,
        off,

        // Mock helpers
        simulatePublisherJoined
    }
}
