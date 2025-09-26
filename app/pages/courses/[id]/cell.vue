<script setup lang="ts">
import type { CourseDetailsResponse } from '#shared/types/courseDetailsResponse'
const route = useRoute()
const courseId = route.params.id as string

const { data: courseDetails, pending, error } = await useFetch<CourseDetailsResponse>(`/api/courses/${courseId}/details`)

const isTeacher = computed(() => courseDetails.value?.isTeacher ?? false)
const teacherCell = computed(() => courseDetails.value?.teacherCell)

const cellName = ref(teacherCell.value?.name ?? '')
const allStudents = computed(() => courseDetails.value?.students.map(student => ({
    value: student.id.toString(),
    label: student.name,
    slot: student.name, // for custom display
    photo: student.photoUrl,
})) ?? [])
const selectedStudents = ref<string[]>(teacherCell.value?.students?.map(s => s.id.toString()) ?? [])

const saving = ref(false)

async function handleSubmit() {
    if (!isTeacher.value) {
        alert('Solo los profesores pueden realizar esta acción.')
        return
    }

    saving.value = true
    try {
        await $fetch(`/api/courses/${courseId}/cell`, {
            method: 'POST',
            body: {
                cellName: cellName.value,
                students: selectedStudents.value,
            },
        })

        // Navigate back to the main course page after saving
        await navigateTo(`/courses/${courseId}`)
    } catch (err) {
        console.error('Failed to save cell:', err)
        alert('Hubo un error al guardar la célula.')
    } finally {
        saving.value = false
    }
}
</script>

<template>
    <div class="p-4 sm:p-6 lg:p-8">
        <div v-if="pending">
            Cargando...
        </div>
        <div v-else-if="error">
            Error al cargar los datos del curso.
        </div>
        <div v-else-if="courseDetails">
            <NuxtLink :to="`/courses/${courseId}`" class="mb-4 inline-block text-blue-500 hover:underline">← Volver al curso</NuxtLink>
            <UCard v-if="isTeacher">
                <template #header>
                    <h1 class="text-xl font-bold">
                        Gestionar Célula
                    </h1>
                </template>

                <UForm :state="{ cellName, selectedStudents }" @submit.prevent="handleSubmit">
                    <div class="space-y-6">
                        <UFormField label="Nombre de la Célula" name="cellName">
                            <UInput v-model="cellName" required />
                        </UFormField>

                        <UCheckboxGroup
                            v-model="selectedStudents"
                            :items="allStudents"
                            legend="Seleccionar Alumnos"
                            class="space-y-2"
                        >
                            <template #label="{ item }">
                                <div class="flex items-center gap-2">
                                    <UAvatar :src="item.photo" size="2xs" />
                                    <span>{{ item.label }}</span>
                                </div>
                            </template>
                        </UCheckboxGroup>

                        <UButton type="submit" label="Guardar Célula" :loading="saving" />
                    </div>
                </UForm>
            </UCard>
            <div v-else>
                <p>
                    No tienes permiso para ver esta página.
                </p>
            </div>
        </div>
    </div>
</template>
