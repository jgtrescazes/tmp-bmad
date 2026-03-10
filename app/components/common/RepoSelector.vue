<script setup lang="ts">
/**
 * Repository Selector Component
 * Dropdown menu for selecting the active repository
 * MVP: Pre-selects "International" (mono-repo)
 */

const { currentRepo, repositories, isLoading, selectRepository, init } = useRepository()

// Initialize on mount
onMounted(async () => {
  await init()
})

// Build dropdown items from repositories
const repoItems = computed(() => {
  return repositories.value.map(repo => ({
    label: repo.display_name || repo.name,
    icon: currentRepo.value?.id === repo.id ? 'i-lucide-check' : undefined,
    onSelect: () => selectRepository(repo.id)
  }))
})

// Display label for current repo
const currentLabel = computed(() => {
  if (isLoading.value) return 'Loading...'
  return currentRepo.value?.display_name || currentRepo.value?.name || 'Select repo'
})
</script>

<template>
  <UDropdownMenu
    :items="[repoItems]"
    :ui="{
      content: 'min-w-48'
    }"
  >
    <UButton
      variant="ghost"
      color="neutral"
      :loading="isLoading"
      class="gap-2"
    >
      <UIcon name="i-lucide-git-branch" class="size-4" />
      <span>{{ currentLabel }}</span>
      <UIcon name="i-lucide-chevron-down" class="size-4 opacity-50" />
    </UButton>
  </UDropdownMenu>
</template>
