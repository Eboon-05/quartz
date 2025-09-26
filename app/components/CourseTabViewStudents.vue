<script setup lang='ts'>
import type { CourseDetailsResponse } from '#shared/types/courseDetailsResponse'

defineProps<{ courseDetails: CourseDetailsResponse }>()
</script>

<template>
    <div>
        <h2 class="text-xl font-semibold mb-4">Todos los Alumnos del Curso</h2>
        <ul v-if="courseDetails.students && courseDetails.students.length > 0" class="space-y-3">
            <li v-for="student in courseDetails.students" :key="student.id.toString()" class="flex items-center gap-3 p-3 bg-white rounded-md border shadow-sm">
                <UAvatar :src="student.photoUrl" :alt="student.name" />
                <div>
                    <p class="font-medium">{{ student.name }}</p>
                    <p class="text-sm text-gray-600">{{ student.email }}</p>
                </div>
            </li>
        </ul>
        <p v-else class="text-gray-500">No hay estudiantes matriculados en este curso.</p>
    </div>
</template>
