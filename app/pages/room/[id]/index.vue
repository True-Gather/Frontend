<script setup lang="ts">
definePageMeta({
  layout: 'room'
})

const route = useRoute()
const router = useRouter()
const roomStore = useRoomStore()
const toastStore = useToastStore()

const roomId = route.params.id as string

// Check if already joined, if not redirect to lobby
onMounted(async () => {
  if (!roomStore.isJoined) {
    router.push(`/room/${roomId}/lobby`)
    return
  }

  // Start publishing when entering the room
  try {
    await roomStore.startPublishing()
  } catch (error) {
    console.error('Failed to start publishing:', error)
  }
})

// Leave room handler
async function handleLeave() {
  await roomStore.leaveRoom()
  router.push('/')
}

// Cleanup on unmount
onUnmounted(() => {
  roomStore.cleanup()
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Video grid -->
    <div class="flex-1 overflow-hidden pb-24">
      <VideoGrid
        :local-stream="roomStore.localStream"
        :local-display-name="roomStore.displayName"
        :is-local-muted="roomStore.isMuted"
        :is-local-video-off="roomStore.isVideoOff"
      />
    </div>

    <!-- Controls -->
    <MediaControls @leave="handleLeave" />
  </div>
</template>
