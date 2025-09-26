<script setup lang="ts">
import type { CourseDetailsResponse } from '#shared/types/courseDetailsResponse'
import type { CheckboxGroupItem } from '@nuxt/ui'
import { RecordId } from 'surrealdb'

const route = useRoute()
const user = useUser()
const courseId = route.params.id as string

const { data, pending, error } = await useFetch<CourseDetailsResponse>(`/api/courses/${courseId}`)

const isTeacher = computed(() => {
    if (!data.value?.teachers || !user.value?.id) return false
    const userId = new RecordId('user', user.value.id)
    return data.value.teachers.some(teacher => teacher.id === userId)
})

console.log(data.value?.students.map(student => ({
    value: student.id.toString(),
    label: student.name,
})))

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

    alert('Célula guardada con éxito!')
    // TODO: Redirigir o actualizar la UI
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
        <div v-else-if="data && user">
            <UCard v-if="true">
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
