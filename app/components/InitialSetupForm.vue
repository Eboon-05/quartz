<script setup lang="ts">
// We need the courseId to fetch the correct students
const props = defineProps({
    courseId: {
        type: String,
        required: true,
    },
})

const emit = defineEmits(['roleSet'])

// Form state
const settingRole = ref(false)
const error = ref<string | null>(null)





async function setRole(role: 'teacher' | 'coordinator') {
    settingRole.value = true
    error.value = null
    try {
        const endpoint = role === 'teacher' ? 'set-teacher' : 'set-coord'
        await $fetch(`/api/courses/${props.courseId}/${endpoint}`, {
            method: 'POST',
        })
        emit('roleSet')
    } catch (e) {
        if (typeof e === 'object' && e !== null && 'data' in e) {
            const fetchError = e as { data?: { message?: string } }
            error.value = fetchError.data?.message || 'An unexpected error occurred.'
        } else {
            error.value = 'An unexpected error occurred.'
        }
    } finally {
        settingRole.value = false
    }
}
</script>

<template>
    <UCard class="max-w-2xl mx-auto">
        <template #header>
            <div class="flex items-center gap-3">
                <UIcon name="i-heroicons-academic-cap" class="w-6 h-6 text-primary" />
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                    Configuración Inicial del Curso
                </h2>
            </div>
        </template>

        <div class="space-y-6">
            <UAlert
                icon="i-heroicons-information-circle"
                color="info"
                variant="soft"
                title="Selecciona tu rol"
                description="Para gestionar este curso, primero debes establecer tu rol. Esta acción es permanente."
            />

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UButton 
                    label="Soy Profesor"
                    :loading="settingRole"
                    color="primary"
                    size="xl"
                    icon="i-heroicons-user-group"
                    block
                    @click="setRole('teacher')" 
                />
                <UButton 
                    label="Soy Coordinador"
                    :loading="settingRole"
                    color="success"
                    size="xl"
                    icon="i-heroicons-cog-6-tooth"
                    block
                    @click="setRole('coordinator')" 
                />
            </div>

            <UAlert
                v-if="error"
                icon="i-heroicons-exclamation-triangle"
                color="error"
                variant="soft"
                :title="error"
            />
        </div>
    </UCard>
</template>
