<script setup lang='ts'>
import type { CourseDetailsResponse } from '#shared/types/courseDetailsResponse'

defineProps<{ courseDetails: CourseDetailsResponse }>()
</script>

<template>
    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Profesores del Curso</h2>
            <UBadge 
                v-if="courseDetails.teachers?.length" 
                :label="`${courseDetails.teachers.length} profesor${courseDetails.teachers.length !== 1 ? 'es' : ''}`"
                color="primary"
                variant="subtle"
            />
        </div>
        
        <div v-if="courseDetails.teachers && courseDetails.teachers.length > 0" class="grid gap-4">
            <UCard 
                v-for="teacher in courseDetails.teachers" 
                :key="teacher.id.toString()"
                class="transition-all duration-200 hover:shadow-md"
            >
                <div class="flex items-center gap-4">
                    <UAvatar 
                        :src="teacher.photoUrl" 
                        :alt="teacher.name"
                        size="lg"
                        class="flex-shrink-0"
                    />
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-gray-900 dark:text-white truncate">
                            {{ teacher.name }}
                        </h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {{ teacher.email }}
                        </p>
                    </div>
                    <UBadge 
                        label="Profesor"
                        color="success"
                        variant="subtle"
                    />
                </div>
            </UCard>
        </div>
        
        <UCard v-else>
            <div class="text-center py-8">
                <div class="mx-auto mb-4 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <UIcon name="i-heroicons-academic-cap" class="text-gray-400 dark:text-gray-500 text-xl" />
                </div>
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No hay profesores asignados
                </h3>
                <p class="text-gray-500 dark:text-gray-400">
                    Este curso aún no tiene profesores asignados.
                </p>
            </div>
        </UCard>
    </div>
</template>
