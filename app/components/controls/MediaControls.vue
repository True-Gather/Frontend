<script setup lang="ts">
const roomStore = useRoomStore()
const aiStore = useAiStore()

const emit = defineEmits<{
  leave: []
}>()

// Local state
const isScreenSharing = ref(false)
const showSettings = ref(false)

async function handleToggleMute() {
  roomStore.toggleMute()
}

async function handleToggleVideo() {
  roomStore.toggleVideo()
}

async function handleScreenShare() {
  // Screen sharing toggle would go here
  isScreenSharing.value = !isScreenSharing.value
}

function handleLeave() {
  emit('leave')
}

function handleOpenAi() {
  aiStore.togglePanel()
}
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 p-4 z-40">
    <div class="max-w-3xl mx-auto">
      <!-- Main controls bar -->
      <div class="flex items-center justify-center gap-2 p-3 rounded-2xl bg-bg-secondary/90 backdrop-blur-xl border border-border shadow-2xl">
        <!-- Mute toggle -->
        <button
          :class="[
            'relative p-3 rounded-xl transition-all duration-200',
            roomStore.isMuted
              ? 'bg-danger text-white hover:bg-danger-light'
              : 'bg-bg-elevated text-text-primary hover:bg-bg-hover'
          ]"
          :title="roomStore.isMuted ? 'Unmute' : 'Mute'"
          @click="handleToggleMute"
        >
          <Icon
            :name="roomStore.isMuted ? 'heroicons:microphone-solid' : 'heroicons:microphone'"
            class="w-6 h-6"
          />
          <!-- Strikethrough line when muted -->
          <div
            v-if="roomStore.isMuted"
            class="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div class="w-8 h-0.5 bg-white rotate-45" />
          </div>
        </button>

        <!-- Video toggle -->
        <button
          :class="[
            'relative p-3 rounded-xl transition-all duration-200',
            roomStore.isVideoOff
              ? 'bg-danger text-white hover:bg-danger-light'
              : 'bg-bg-elevated text-text-primary hover:bg-bg-hover'
          ]"
          :title="roomStore.isVideoOff ? 'Turn on camera' : 'Turn off camera'"
          @click="handleToggleVideo"
        >
          <Icon
            :name="roomStore.isVideoOff ? 'heroicons:video-camera-slash' : 'heroicons:video-camera'"
            class="w-6 h-6"
          />
        </button>

        <!-- Divider -->
        <div class="w-px h-8 bg-border mx-1" />

        <!-- Screen share -->
        <button
          :class="[
            'p-3 rounded-xl transition-all duration-200',
            isScreenSharing
              ? 'bg-accent text-white'
              : 'bg-bg-elevated text-text-primary hover:bg-bg-hover'
          ]"
          title="Share screen"
          @click="handleScreenShare"
        >
          <Icon name="heroicons:computer-desktop" class="w-6 h-6" />
        </button>

        <!-- AI Assistant -->
        <button
          :class="[
            'p-3 rounded-xl transition-all duration-200',
            aiStore.isPanelOpen
              ? 'bg-accent text-white'
              : 'bg-bg-elevated text-text-primary hover:bg-bg-hover'
          ]"
          title="AI Assistant"
          @click="handleOpenAi"
        >
          <Icon name="heroicons:sparkles" class="w-6 h-6" />
        </button>

        <!-- Settings -->
        <button
          class="p-3 rounded-xl bg-bg-elevated text-text-primary hover:bg-bg-hover transition-all duration-200"
          title="Settings"
          @click="showSettings = true"
        >
          <Icon name="heroicons:cog-6-tooth" class="w-6 h-6" />
        </button>

        <!-- Divider -->
        <div class="w-px h-8 bg-border mx-1" />

        <!-- Leave button -->
        <button
          class="px-5 py-3 rounded-xl bg-danger text-white hover:bg-danger-light transition-all duration-200 flex items-center gap-2"
          title="Leave meeting"
          @click="handleLeave"
        >
          <Icon name="heroicons:phone-x-mark" class="w-5 h-5" />
          <span class="font-medium hidden sm:inline">Leave</span>
        </button>
      </div>
    </div>
  </div>
</template>
