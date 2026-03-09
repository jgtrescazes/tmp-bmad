<script setup lang="ts">
const { selectedPreset, setPreset, presets } = usePeriod()

const items = computed(() =>
  presets.map(p => ({
    label: p.label,
    value: p.value,
    click: () => setPreset(p.value)
  }))
)

const currentLabel = computed(() =>
  presets.find(p => p.value === selectedPreset.value)?.label || 'Période'
)
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton color="neutral" variant="ghost" trailing-icon="i-lucide-chevron-down">
      <UIcon name="i-lucide-calendar" class="size-4 mr-1" />
      {{ currentLabel }}
    </UButton>
  </UDropdownMenu>
</template>
