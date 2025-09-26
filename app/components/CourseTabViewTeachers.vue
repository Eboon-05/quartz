<script setup lang='ts'>
import type { CourseDetailsResponse } from '#shared/types/courseDetailsResponse'

defineProps<{ courseDetails: CourseDetailsResponse }>()
</script>

<template>
    <div>
        <h2 class="text-xl font-semibold mb-4">Profesores del Curso</h2>
        <ul v-if="courseDetails.teachers && courseDetails.teachers.length > 0" class="space-y-3">
            <li v-for="teacher in courseDetails.teachers" :key="teacher.id.toString()" class="flex items-center gap-3 p-3 bg-white rounded-md border shadow-sm">
                <UAvatar :src="teacher.photoUrl" :alt="teacher.name" />
                <div>
                    <p class="font-medium">{{ teacher.name }}</p>
                    <p class="text-sm text-gray-600">{{ teacher.email }}</p>
                </div>
            </li>
        </ul>
        <p v-else class="text-gray-500">No hay profesores asignados a este curso.</p>
    </div>
</template>
