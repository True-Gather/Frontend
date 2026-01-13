<script setup lang="ts">
const roomStore = useRoomStore()

const isOpen = ref(false)

// Get participants as array
const participants = computed(() => Array.from(roomStore.participants.values()))
const publishers = computed(() => Array.from(roomStore.publishers.values()))
</script>

<template>
  <div class="flex flex-col h-full bg-bg-secondary">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-border">
      <div class="flex items-center gap-2">
        <Icon name="heroicons:users" class="w-5 h-5 text-text-secondary" />
        <h2 class="font-semibold text-text-primary">
          Participants
        </h2>
        <span class="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-sm font-medium">
          {{ roomStore.participantCount }}
        </span>
      </div>
    </div>

    <!-- Participants list -->
    <div class="flex-1 overflow-y-auto p-2">
      <!-- Current user (always first) -->
      <div
        v-if="roomStore.userId"
        class="flex items-center gap-3 p-3 rounded-xl hover:bg-bg-hover transition-colors"
      >
        <Avatar :name="roomStore.displayName" size="sm" status="online" />
        
        <div class="flex-1 min-w-0">
          <p class="font-medium text-text-primary truncate">
            {{ roomStore.displayName }}
            <span class="text-text-muted font-normal">(You)</span>
          </p>
        </div>

        <!-- Status icons -->
        <div class="flex items-center gap-1">
          <div
            v-if="roomStore.isMuted"
            class="p-1 rounded bg-danger/20"
            title="Muted"
          >
            <Icon name="heroicons:microphone-solid" class="w-4 h-4 text-danger" />
          </div>
          <div
            v-if="roomStore.isVideoOff"
            class="p-1 rounded bg-danger/20"
            title="Camera off"
          >
            <Icon name="heroicons:video-camera-slash" class="w-4 h-4 text-danger" />
          </div>
        </div>
      </div>

      <!-- Other publishers -->
      <div
        v-for="publisher in publishers"
        :key="publisher.feed_id"
        class="flex items-center gap-3 p-3 rounded-xl hover:bg-bg-hover transition-colors"
      >
        <Avatar :name="publisher.display" size="sm" status="online" />
        
        <div class="flex-1 min-w-0">
          <p class="font-medium text-text-primary truncate">
            {{ publisher.display }}
          </p>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="participants.length === 0 && publishers.length === 0"
        class="flex flex-col items-center justify-center py-8 text-center"
      >
        <Icon name="heroicons:user-group" class="w-12 h-12 text-text-muted mb-3" />
        <p class="text-sm text-text-secondary">
          No other participants yet
        </p>
      </div>
    </div>

    <!-- Footer actions -->
    <div class="p-4 border-t border-border">
      <button
        class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-bg-elevated hover:bg-bg-hover text-text-primary transition-colors"
      >
        <Icon name="heroicons:user-plus" class="w-5 h-5" />
        <span class="font-medium">Invite participants</span>
      </button>
    </div>
  </div>
</template>
