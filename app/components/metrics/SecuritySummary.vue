<script setup lang="ts">
import { useSecuritySummary, getSeverityBadgeColor } from '~/composables/useSecurityMetrics'

const { data: summary, pending, error } = useSecuritySummary()

const hasData = computed(() => summary.value && summary.value.total > 0)

const severities = computed(() => {
  if (!summary.value) return []

  return [
    { label: 'Crit', value: summary.value.critical, severity: 'critical' as const },
    { label: 'High', value: summary.value.high, severity: 'high' as const },
    { label: 'Med', value: summary.value.medium, severity: 'medium' as const },
    { label: 'Low', value: summary.value.low, severity: 'low' as const }
  ]
})
</script>

<template>
  <div>
    <USkeleton v-if="pending" class="h-32" />

    <UAlert
      v-else-if="error"
      color="red"
      :title="error.message"
      icon="i-lucide-alert-triangle"
      size="sm"
    />

    <div v-else-if="!hasData && !summary" class="flex flex-col items-center justify-center py-8 text-center">
      <UIcon name="i-lucide-construction" class="size-10 text-[var(--ui-text-muted)]" />
      <p class="mt-3 text-sm text-[var(--ui-text-muted)]">
        Collecteur Dependabot non configuré
      </p>
    </div>

    <div v-else-if="summary && summary.total === 0" class="flex flex-col items-center justify-center py-8 text-center">
      <UIcon name="i-lucide-shield-check" class="size-10 text-green-500" />
      <p class="mt-3 text-sm font-medium text-green-500">
        Aucune vulnérabilité
      </p>
    </div>

    <div v-else class="space-y-3">
      <div class="grid grid-cols-4 gap-2">
        <div
          v-for="item in severities"
          :key="item.severity"
          class="text-center"
        >
          <div class="text-xs text-[var(--ui-text-muted)]">
            {{ item.label }}
          </div>
          <div class="text-lg font-bold">
            <UBadge
              v-if="item.value > 0"
              :color="getSeverityBadgeColor(item.severity)"
              variant="subtle"
            >
              {{ item.value }}
            </UBadge>
            <span v-else class="text-[var(--ui-text-muted)]">0</span>
          </div>
        </div>
      </div>

      <div v-if="summary" class="text-center pt-2 border-t border-[var(--ui-border)]">
        <span class="text-sm text-[var(--ui-text-muted)]">Total: </span>
        <span class="font-semibold">{{ summary.total }}</span>
      </div>
    </div>
  </div>
</template>
