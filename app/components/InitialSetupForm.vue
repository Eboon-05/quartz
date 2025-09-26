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
    <div class="max-w-2xl mx-auto p-6 bg-white border border-gray-200 rounded-lg shadow-md">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">Configuración Inicial del Curso</h2>
        <p class="text-gray-600 mb-6">Para gestionar este curso, primero debes establecer tu rol. Esta acción es permanente.</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UButton 
                label="Soy Profesor"
                :loading="settingRole"
                size="xl"
                block
                @click="setRole('teacher')" 
            />
            <UButton 
                label="Soy Coordinador"
                :loading="settingRole"
                color="green"
                size="xl"
                block
                @click="setRole('coordinator')" 
            />
        </div>

        <div v-if="error" class="mt-4 text-red-500">
            <p>Error: {{ error }}</p>
        </div>
    </div>
</template>
