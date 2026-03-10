<script setup lang="ts">
import {
  useQualitySummary,
  formatCoverage,
  COVERAGE_THRESHOLDS
} from '~/composables/useQualityMetrics'

const { data: summary, pending, error } = useQualitySummary()

const hasData = computed(() =>
  summary.value
  && (summary.value.lines !== null || summary.value.functions !== null || summary.value.classes !== null)
)

const coverageItems = computed(() => {
  if (!summary.value) return []

  return [
    { label: 'Lines', value: summary.value.lines },
    { label: 'Funcs', value: summary.value.functions },
    { label: 'Classes', value: summary.value.classes }
  ]
})

function getProgressColor(value: number | null): string {
  if (value === null) return 'gray'
  if (value >= COVERAGE_THRESHOLDS.good) return 'primary'
  if (value >= COVERAGE_THRESHOLDS.acceptable) return 'warning'
  return 'error'
}
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

    <div v-else-if="!hasData" class="flex flex-col items-center justify-center py-8 text-center">
      <UIcon name="i-lucide-construction" class="size-10 text-[var(--ui-text-muted)]" />
      <p class="mt-3 text-sm text-[var(--ui-text-muted)]">
        Collecteur Coverage non configuré
      </p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="item in coverageItems"
        :key="item.label"
        class="space-y-1"
      >
        <div class="flex justify-between text-sm">
          <span class="text-[var(--ui-text-muted)]">{{ item.label }}</span>
          <span
            :class="[
              'font-medium',
              item.value !== null && item.value < COVERAGE_THRESHOLDS.acceptable
                ? 'text-red-500'
                : ''
            ]"
          >
            {{ formatCoverage(item.value) }}
          </span>
        </div>
        <UProgress
          :value="item.value || 0"
          :max="100"
          :color="getProgressColor(item.value)"
          size="xs"
        />
      </div>
    </div>
  </div>
</template>
