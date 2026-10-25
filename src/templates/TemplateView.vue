<template>
  <component :is="view" :key="route.fullPath" v-bind="route.params" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { templates, type ViewName } from '@/templates'

const route = useRoute()
const themeStore = useThemeStore()
const view = computed(() => templates[themeStore.template].views[route.name as ViewName])
</script>
