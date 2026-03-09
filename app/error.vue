<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

useSeoMeta({
  title: 'Page non trouvée',
  description: 'Cette page n\'existe pas.'
})

useHead({
  htmlAttrs: {
    lang: 'fr'
  }
})
</script>

<template>
  <UApp>
    <UError :error="error" />
  </UApp>
</template>
