<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const open = ref(false)

const links = [[{
  label: 'Vue d\'ensemble',
  icon: 'i-lucide-layout-dashboard',
  to: '/',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Stabilité',
  icon: 'i-lucide-shield-check',
  to: '/stability',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Performance',
  icon: 'i-lucide-gauge',
  to: '/performance',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Sécurité',
  icon: 'i-lucide-lock',
  to: '/security',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Qualité',
  icon: 'i-lucide-test-tubes',
  to: '/quality',
  onSelect: () => {
    open.value = false
  }
}], [{
  label: 'Rapport',
  icon: 'i-lucide-file-text',
  to: '/report',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Santé système',
  icon: 'i-lucide-activity',
  to: '/health',
  onSelect: () => {
    open.value = false
  }
}]] satisfies NavigationMenuItem[][]

const groups = computed(() => [{
  id: 'links',
  label: 'Navigation',
  items: links.flat()
}])
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
    >
      <template #header="{ collapsed }">
        <div class="flex items-center gap-2 p-2">
          <UIcon name="i-lucide-tower-control" class="size-6 text-primary" />
          <span v-if="!collapsed" class="font-semibold text-sm">Watchtower</span>
        </div>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <!-- Source status alert -->
        <div v-if="!collapsed" class="px-2 mb-2">
          <CommonSourceStatusBadge />
        </div>

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />
  </UDashboardGroup>
</template>
