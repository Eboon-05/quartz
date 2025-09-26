<script setup lang='ts'>
import type { CourseDetailsResponse } from '#shared/types/courseDetailsResponse'
import type { DBCell } from '#shared/types/db'
import CellReport from './CellReport.vue'

const props = defineProps<{ courseDetails: CourseDetailsResponse, courseId: string }>()

// Estado para la célula seleccionada
const selectedCellId = ref<string | null>(null)

// Al inicio, seleccionar la célula del profesor si existe, o la primera célula disponible
watchEffect(() => {
    if (!selectedCellId.value && props.courseDetails?.cells?.length > 0) {
        // Si el profesor tiene célula, seleccionarla
        if (props.courseDetails.teacherCell?.id) {
            const cellId = props.courseDetails.teacherCell.id
            selectedCellId.value = cellId.toString().split(':')[1]
        } else {
            // Si no tiene célula propia, seleccionar la primera disponible
            const firstCell = props.courseDetails.cells.find(cell => cell.id)
            if (firstCell?.id) {
                selectedCellId.value = firstCell.id.toString().split(':')[1]
            }
        }
    }
})

// Opciones para el selector de células
const cellOptions = computed(() => {
    if (!props.courseDetails?.cells) return []
    
    return props.courseDetails.cells
        .filter((cell: DBCell) => cell.id) // Filtrar células sin ID
        .map((cell: DBCell) => ({
            label: cell.name || 'Célula sin nombre',
            value: cell.id!.toString().split(':')[1],
            isTeacherCell: props.courseDetails.teacherCell?.id 
                ? cell.id!.toString() === props.courseDetails.teacherCell.id.toString()
                : false,
            cellId: cell.id!.toString().split(':')[1]
        }))
})

// Célula actualmente seleccionada
const selectedCell = computed(() => {
    if (!selectedCellId.value || !props.courseDetails?.cells) return null
    return props.courseDetails.cells.find(
        cell => cell.id && cell.id.toString().split(':')[1] === selectedCellId.value
    )
})

// Verificar si la célula seleccionada es la del profesor
const isViewingOwnCell = computed(() => {
    return props.courseDetails?.teacherCell?.id && 
           selectedCellId.value === props.courseDetails.teacherCell.id.toString().split(':')[1]
})
</script>

<template>
    <div>
        <!-- Sección de tu célula con botón de crear/editar -->
        <div class="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div v-if="courseDetails.teacherCell" class="flex justify-between items-center">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                        Tu Célula
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ courseDetails.teacherCell.name }}
                    </p>
                </div>
                <NuxtLink
                    :to="`/courses/${courseId}/cell`"
                    class="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                    <UIcon name="i-heroicons-pencil-square" class="w-4 h-4 mr-2" />
                    Editar Célula
                </NuxtLink>
            </div>
            <div v-else>
                <p class="text-gray-600 dark:text-gray-400 mb-2">
                    Aún no has creado una célula para este curso.
                </p>
                <NuxtLink
                    :to="`/courses/${courseId}/cell`"
                    class="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                >
                    <UIcon name="i-heroicons-plus-circle" class="w-4 h-4 mr-2" />
                    Crear Célula
                </NuxtLink>
            </div>
        </div>


        <!-- Si hay células disponibles, mostrar el selector y el reporte -->
        <div v-if="cellOptions.length > 0">
            <!-- Selector de células -->
            <div class="mb-6">
                <div class="flex items-center gap-4">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Analizar célula:
                    </label>
                    <USelectMenu
                        v-model="selectedCellId"
                        :options="cellOptions"
                        value-attribute="value"
                        option-attribute="label"
                        class="w-80"
                        placeholder="Selecciona una célula"
                    >
                        <template #option="{ option }">
                            <div class="flex items-center justify-between w-full">
                                <div class="flex flex-col">
                                    <span class="font-medium">{{ option.label }}</span>
                                    <span class="text-xs text-gray-500">ID: {{ option.cellId }}</span>
                                </div>
                                <UBadge v-if="option.isTeacherCell" size="xs" color="primary" variant="subtle">
                                    Tu célula
                                </UBadge>
                            </div>
                        </template>
                        <template #label>
                            <span v-if="selectedCell" class="flex items-center gap-2">
                                {{ selectedCell.name }}
                                <UBadge v-if="isViewingOwnCell" size="xs" color="primary" variant="subtle">
                                    Tu célula
                                </UBadge>
                            </span>
                            <span v-else class="text-gray-500">Selecciona una célula</span>
                        </template>
                    </USelectMenu>
                </div>
                
                <!-- Mensaje informativo -->
                <div v-if="!courseDetails.teacherCell" class="mt-2">
                    <UAlert
                        icon="i-heroicons-light-bulb"
                        color="warning"
                        variant="subtle"
                        description="Puedes explorar las células existentes antes de crear la tuya propia."
                    />
                </div>
                <div v-else-if="!isViewingOwnCell && selectedCell" class="mt-2">
                    <UAlert
                        icon="i-heroicons-information-circle"
                        color="info"
                        variant="subtle"
                        :description="`Estás analizando la célula: ${selectedCell.name} (ID: ${selectedCellId})`"
                    />
                </div>
            </div>

            <!-- Reporte de la célula seleccionada -->
            <div v-if="selectedCellId && selectedCell">
                <CellReport :cell-id="selectedCellId" />
            </div>
        </div>
        
        <!-- Mensaje cuando no hay células creadas en el curso -->
        <div v-else class="text-center py-12">
            <div class="text-gray-400 mb-2">
                <UIcon name="i-heroicons-user-group" class="w-12 h-12 mx-auto" />
            </div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-1">
                No hay células en este curso
            </h3>
            <p class="text-gray-500 dark:text-gray-400 mb-4">
                Sé el primero en crear una célula para organizar a los estudiantes.
            </p>
            <NuxtLink
                :to="`/courses/${courseId}/cell`"
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
            >
                <UIcon name="i-heroicons-plus-circle" class="w-4 h-4 mr-2" />
                Crear Primera Célula
            </NuxtLink>
        </div>
    </div>
</template>
