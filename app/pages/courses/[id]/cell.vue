<script setup lang="ts">
import type { DBUser } from '#shared/types/db'

const route = useRoute()
const user = useUser()
const courseId = route.params.id as string

const { data, pending, error } = await useFetch(`/api/courses/${courseId}`)

const isTeacher = computed(() => {
    if (!data.value || !user.value) return false
    // @ts-expect-error SurrealDB relation is weird
    return data.value.teachers.some(teacher => teacher.id === user.value.id)
})

const cellName = ref('')
const selectedStudents = ref<string[]>([])

async function handleSubmit() {
    if (!isTeacher.value) {
        alert('Solo los profesores pueden crear células.')
        return
    }

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
    <div>
        <div v-if="pending">
            Cargando...
        </div>
        <div v-else-if="error">
            Error al cargar los datos del curso.
        </div>
        <div v-else-if="data && user">
            <div v-if="isTeacher">
                <h1>
                    Gestionar Célula
                </h1>
                <form @submit.prevent="handleSubmit">
                    <div>
                        <label for="cellName">Nombre de la Célula:</label>
                        <input
                            id="cellName"
                            v-model="cellName"
                            type="text"
                            required
                        />
                    </div>

                    <h2>
                        Seleccionar Alumnos
                    </h2>
                    <!-- @ts-expect-error SurrealDB relation is weird -->
                    <div v-for="student in data.students as DBUser[]" :key="student.id">
                        <input
                            :id="student.id"
                            v-model="selectedStudents"
                            :value="student.id"
                            type="checkbox"
                        />
                        <label :for="student.id">
                            {{ student.name }}
                        </label>
                    </div>

                    <button type="submit">
                        Guardar Célula
                    </button>
                </form>
            </div>
            <div v-else>
                <p>
                    No tienes permiso para ver esta página.
                </p>
            </div>
        </div>
    </div>
</template>
