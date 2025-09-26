<script setup lang='ts'>
import type { CourseDetailsResponse } from '#shared/types/courseDetailsResponse'

defineProps<{ courseDetails: CourseDetailsResponse, courseId: string }>()
</script>

<template>
    <div>
        <div v-if="courseDetails.teacherCell">
            <div class="flex justify-between items-center mb-4">
                <h2 class='text-xl font-semibold'>
                    Tu Célula: {{ courseDetails.teacherCell.name }}
                </h2>
                <NuxtLink
                    :to="`/courses/${courseId}/cell`"
                    class="text-blue-500 hover:underline"
                >
                    Editar Célula
                </NuxtLink>
            </div>

            <h3 class="text-lg font-semibold mb-2">Estudiantes en tu Célula</h3>
            <ul v-if="courseDetails.teacherCell.students && courseDetails.teacherCell.students.length > 0" class="space-y-3">
                <li v-for="student in courseDetails.teacherCell.students.filter(s => s && s.id)" :key="student.id.toString()" class="p-4 border rounded-md bg-white shadow-sm">
                    <p class="font-medium">{{ student.name || 'Name not available' }}</p>
                    <p class="text-sm text-gray-600">{{ student.email || 'Email not available' }}</p>
                </li>
            </ul>
            <p v-else class="text-gray-500">No hay estudiantes asignados a tu célula.</p>
        </div>
        <div v-else>
            <p>Aún no has creado una célula para este curso.</p>
            <NuxtLink
                :to="`/courses/${courseId}/cell`"
                class="text-blue-500 hover:underline"
            >
                Crear una ahora
            </NuxtLink>
        </div>
    </div>
</template>
