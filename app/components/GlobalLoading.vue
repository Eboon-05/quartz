<script setup lang='ts'>
interface Props {
    visible: boolean
    message?: string
    variant?: 'default' | 'minimal'
}

withDefaults(defineProps<Props>(), {
    message: 'Cargando...',
    variant: 'default'
})
</script>

<template>
    <Teleport to="body">
        <Transition
            enter-active-class="transition-opacity duration-300"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-300"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div
                v-if="visible"
                class="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
                role="dialog"
                aria-label="Cargando"
            >
                <div v-if="variant === 'minimal'" class="text-center">
                    <div class="mx-auto w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
                
                <div v-else class="text-center space-y-6">
                    <!-- Logo/Icono animado -->
                    <div class="mx-auto w-16 h-16 relative">
                        <div class="absolute inset-0 rounded-full border-4 border-primary-200 dark:border-primary-800"></div>
                        <div class="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"></div>
                        <div class="absolute inset-2 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                            <UIcon name="i-heroicons-academic-cap" class="text-2xl text-primary-600 dark:text-primary-400" />
                        </div>
                    </div>

                    <!-- Mensaje de carga -->
                    <div class="space-y-2">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                            {{ message }}
                        </h3>
                        <div class="flex items-center justify-center space-x-1">
                            <div
                                v-for="i in 3"
                                :key="i"
                                class="w-2 h-2 bg-primary-500 rounded-full animate-pulse"
                                :style="{ animationDelay: `${i * 0.15}s` }"
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.3;
    }
}

.animate-pulse {
    animation: pulse 1.5s infinite;
}
</style>
