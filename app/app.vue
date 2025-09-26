<script setup lang='ts'>
const { loadingState } = useGlobalLoading()

// Show loading during page transitions
const nuxtApp = useNuxtApp()
const isNavigating = ref(false)

nuxtApp.hook('page:start', () => {
    isNavigating.value = true
})

nuxtApp.hook('page:finish', () => {
    isNavigating.value = false
})
</script>

<template>
    <UApp>
        <NuxtPage />
        
        <!-- Global Loading Screen -->
        <GlobalLoading 
            :visible="loadingState.visible || isNavigating" 
            :message="isNavigating ? 'Navegando...' : loadingState.message"
        />
        
        <!-- Toast Notifications -->
        <UNotifications />
    </UApp>
</template>
