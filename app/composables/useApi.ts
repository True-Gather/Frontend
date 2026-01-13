// Mock API composable for development without backend
import type { Room, JoinResponse, HealthResponse, CreateRoomRequest, JoinRoomRequest } from '~/types'

// Mock data store
const mockRooms = new Map<string, Room>()

// Generate UUIDs
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

export function useApi() {
    const config = useRuntimeConfig()
    const baseUrl = config.public.apiBaseUrl

    /**
     * Create a new room
     */
    async function createRoom(data: CreateRoomRequest): Promise<Room> {
        // Mock implementation
        const room: Room = {
            room_id: generateUUID(),
            name: data.name,
            created_at: new Date().toISOString(),
            max_publishers: data.max_publishers || 10,
            status: 'active',
            participants_count: 0,
            ttl_seconds: data.ttl_seconds || 7200
        }

        mockRooms.set(room.room_id, room)

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300))

        return room
    }

    /**
     * Get room details
     */
    async function getRoom(roomId: string): Promise<Room> {
        await new Promise(resolve => setTimeout(resolve, 200))

        const room = mockRooms.get(roomId)
        if (!room) {
            throw new Error('Room not found')
        }

        return room
    }

    /**
     * Join a room
     */
    async function joinRoom(roomId: string, data: JoinRoomRequest): Promise<JoinResponse> {
        await new Promise(resolve => setTimeout(resolve, 300))

        const room = mockRooms.get(roomId)
        if (!room) {
            throw new Error('Room not found')
        }

        // Update participants count
        room.participants_count++

        const userId = generateUUID()
        const token = `mock-jwt-token-${userId}-${Date.now()}`

        return {
            room_id: roomId,
            user_id: userId,
            ws_url: `ws://localhost:8080/ws?room_id=${roomId}&token=${token}`,
            token,
            ice_servers: [
                {
                    urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302']
                }
            ],
            expires_in: 900
        }
    }

    /**
     * Leave a room
     */
    async function leaveRoom(roomId: string, _token: string): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 100))

        const room = mockRooms.get(roomId)
        if (room && room.participants_count > 0) {
            room.participants_count--
        }
    }

    /**
     * Get server health
     */
    async function getHealth(): Promise<HealthResponse> {
        await new Promise(resolve => setTimeout(resolve, 100))

        return {
            status: 'healthy',
            redis: 'connected',
            janus: 'connected',
            timestamp: new Date().toISOString()
        }
    }

    /**
     * List all rooms (mock only)
     */
    async function listRooms(): Promise<Room[]> {
        await new Promise(resolve => setTimeout(resolve, 200))
        return Array.from(mockRooms.values())
    }

    return {
        baseUrl,
        createRoom,
        getRoom,
        joinRoom,
        leaveRoom,
        getHealth,
        listRooms
    }
}
