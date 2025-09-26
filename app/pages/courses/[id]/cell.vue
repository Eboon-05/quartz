<script setup lang="ts">
import type { CourseDetailsResponse } from '#shared/types/courseDetailsResponse'
import type { CheckboxGroupItem } from '@nuxt/ui'
const route = useRoute()
const courseId = route.params.id as string

const { data, pending, error } = await useFetch<CourseDetailsResponse>(`/api/courses/${courseId}`)

const isTeacher = computed(() => data.value?.isTeacher ?? false)

const cellName = ref('')
const students = ref<CheckboxGroupItem[]>(data.value?.students.map(student => ({
    value: student.id.toString(),
    label: student.name,
})) ?? [])
const selectedStudents = ref<string[]>([])

async function handleSubmit() {
    // if (!isTeacher.value) {
    //     alert('Solo los profesores pueden crear células.')
    //     return
    // }

    await $fetch(`/api/courses/${courseId}/cell`, {
        method: 'POST',
        body: {
            cellName: cellName.value,
            students: selectedStudents.value,
        },
    })

    navigateTo(`/courses/${courseId}`)
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
        <div v-else-if="data">
            <NuxtLink :to="`/courses/${courseId}`">Volver al curso</NuxtLink>
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
                            :items="students"
                        />

                        <UButton type="submit" label="Guardar Célula" />
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
