<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="pointer-events-auto max-w-sm w-80 rounded-lg shadow-[0_8px_24px_-8px_rgb(0_0_0/0.25)] border"
          :class="containerClasses(notification.type)"
        >
          <div class="p-4">
            <div class="flex items-start gap-3">
              <!-- Icon -->
              <div class="flex-shrink-0">
                <component :is="getIcon(notification.type)" class="w-5 h-5" :class="iconClasses(notification.type)" />
              </div>
              
              <!-- Content -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold" :class="titleClasses(notification.type)">
                  {{ notification.title }}
                </p>
                <p v-if="notification.message" class="mt-1 text-sm" :class="messageClasses(notification.type)">
                  {{ notification.message }}
                </p>
              </div>

              <!-- Close button -->
              <button
                @click="notificationStore.removeNotification(notification.id)"
                class="flex-shrink-0 p-1 rounded-md transition-colors"
                :class="closeButtonClasses(notification.type)"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import type { Notification } from '@/models'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-vue-next'

const notificationStore = useNotificationStore()
const notifications = computed(() => notificationStore.notifications)

function getIcon(type: Notification['type']) {
  const icons = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info
  }
  return icons[type]
}

function containerClasses(_type: Notification['type']) {
  return 'bg-surface border-rule'
}

function iconClasses(type: Notification['type']) {
  return { success: 'text-success', error: 'text-danger', warning: 'text-due', info: 'text-focus' }[type]
}

function titleClasses(_type: Notification['type']) {
  return 'text-ink'
}

function messageClasses(_type: Notification['type']) {
  return 'text-ink-2'
}

function closeButtonClasses(_type: Notification['type']) {
  return 'text-ink-3 hover:bg-tint hover:text-ink'
}
</script>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.2s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
