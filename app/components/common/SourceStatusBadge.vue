<script setup lang="ts">
const { failedCount, hasFailures } = useCollectionStatus()
</script>

<template>
  <NuxtLink v-if="hasFailures" to="/health">
    <UBadge color="red" variant="subtle" class="cursor-pointer">
      <UIcon name="i-lucide-alert-circle" class="mr-1 size-3.5" />
      {{ failedCount }} source{{ failedCount > 1 ? 's' : '' }} en erreur
    </UBadge>
  </NuxtLink>
</template>
