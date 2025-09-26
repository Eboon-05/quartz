<script setup lang='ts'>
import type { CourseDetailsResponse } from '#shared/types/courseDetailsResponse'

defineProps<{ courseDetails: CourseDetailsResponse }>()
</script>

<template>
    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Alumnos del Curso</h2>
            <UBadge 
                v-if="courseDetails.students?.length" 
                :label="`${courseDetails.students.length} estudiante${courseDetails.students.length !== 1 ? 's' : ''}`"
                color="secondary"
                variant="subtle"
            />
        </div>
        
        <div v-if="courseDetails.students && courseDetails.students.length > 0" class="grid gap-4">
            <UCard 
                v-for="student in courseDetails.students" 
                :key="student.id.toString()"
                class="transition-all duration-200 hover:shadow-md"
            >
                <div class="flex items-center gap-4">
                    <UAvatar 
                        :src="student.photoUrl" 
                        :alt="student.name"
                        size="lg"
                        class="flex-shrink-0"
                    />
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-gray-900 dark:text-white truncate">
                            {{ student.name }}
                        </h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {{ student.email }}
                        </p>
                    </div>
                    <UBadge 
                        label="Estudiante"
                        color="info"
                        variant="subtle"
                    />
                </div>
            </UCard>
        </div>
        
        <UCard v-else>
            <div class="text-center py-8">
                <div class="mx-auto mb-4 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <UIcon name="i-heroicons-user-group" class="text-gray-400 dark:text-gray-500 text-xl" />
                </div>
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No hay estudiantes matriculados
                </h3>
                <p class="text-gray-500 dark:text-gray-400">
                    Este curso aún no tiene estudiantes matriculados.
                </p>
            </div>
        </UCard>
    </div>
</template>
