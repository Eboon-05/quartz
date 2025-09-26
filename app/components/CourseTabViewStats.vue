<script setup lang='ts'>
import { Bar, Doughnut } from 'vue-chartjs'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
} from 'chart.js'
import type { CourseDetailsResponse } from '#shared/types/courseDetailsResponse'
import type { CourseStats } from '~/server/api/courses/[id]/stats.get'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement)

const props = defineProps<{ 
    courseDetails: CourseDetailsResponse
    courseId: string
}>()

// Fetch detailed stats from our new endpoint
const { data: courseStats, pending: statsPending, error: statsError } = await useFetch<CourseStats>(`/api/courses/${props.courseId}/stats`)

// Basic stats
const basicStats = computed(() => {
    const studentCount = props.courseDetails.students?.length ?? 0
    const teacherCount = props.courseDetails.teachers?.length ?? 0
    const coordCount = props.courseDetails.coords?.length ?? 0
    const cellCount = props.courseDetails.cells?.length ?? 0
    
    const avgStudentsPerCell = cellCount > 0 ? (studentCount / cellCount).toFixed(1) : 'N/A'

    return [
        { label: 'Alumnos', value: studentCount, icon: 'i-heroicons-user-group', color: 'blue' },
        { label: 'Profesores', value: teacherCount, icon: 'i-heroicons-academic-cap', color: 'green' },
        { label: 'Coordinadores', value: coordCount, icon: 'i-heroicons-cog-6-tooth', color: 'purple' },
        { label: 'Células', value: cellCount, icon: 'i-heroicons-squares-2x2', color: 'orange' },
        { label: 'Alumnos / Célula', value: avgStudentsPerCell, icon: 'i-heroicons-calculator', color: 'pink' },
    ]
})

// Performance chart data for cells
const cellPerformanceChartData = computed(() => {
    if (!courseStats.value?.cells) return null
    
    return {
        labels: courseStats.value.cells.map(cell => cell.cellName),
        datasets: [
            {
                label: 'Promedio de Calificaciones',
                data: courseStats.value.cells.map(cell => cell.averageGrade),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2,
                borderRadius: 4,
            },
            {
                label: 'Tasa de Completación (%)',
                data: courseStats.value.cells.map(cell => cell.completionRate),
                backgroundColor: 'rgba(34, 197, 94, 0.8)',
                borderColor: 'rgba(34, 197, 94, 1)',
                borderWidth: 2,
                borderRadius: 4,
            }
        ]
    }
})

// Grade distribution chart data
const gradeDistributionChartData = computed(() => {
    if (!courseStats.value?.gradeDistribution) return null
    
    return {
        labels: courseStats.value.gradeDistribution.map(item => item.range),
        datasets: [
            {
                data: courseStats.value.gradeDistribution.map(item => item.count),
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',   // Excellent - green
                    'rgba(59, 130, 246, 0.8)',  // Good - blue  
                    'rgba(251, 191, 36, 0.8)',  // Satisfactory - yellow
                    'rgba(239, 68, 68, 0.8)',   // Needs improvement - red
                ],
                borderColor: [
                    'rgba(34, 197, 94, 1)',
                    'rgba(59, 130, 246, 1)', 
                    'rgba(251, 191, 36, 1)',
                    'rgba(239, 68, 68, 1)',
                ],
                borderWidth: 2,
            }
        ]
    }
})

// Submission status chart data
const submissionStatusChartData = computed(() => {
    if (!courseStats.value?.cells) return null
    
    const totalSubmitted = courseStats.value.cells.reduce((sum, cell) => sum + cell.workStats.submitted, 0)
    const totalGraded = courseStats.value.cells.reduce((sum, cell) => sum + cell.workStats.graded, 0)
    const totalPending = courseStats.value.cells.reduce((sum, cell) => sum + cell.workStats.pending, 0)
    const totalLate = courseStats.value.cells.reduce((sum, cell) => sum + cell.lateSubmissions, 0)
    
    return {
        labels: ['Entregados', 'Calificados', 'Pendientes', 'Tardíos'],
        datasets: [
            {
                data: [totalSubmitted, totalGraded, totalPending, totalLate],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',   // Submitted - green
                    'rgba(59, 130, 246, 0.8)',  // Graded - blue
                    'rgba(251, 191, 36, 0.8)',  // Pending - yellow
                    'rgba(239, 68, 68, 0.8)',   // Late - red
                ],
                borderColor: [
                    'rgba(34, 197, 94, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(251, 191, 36, 1)',
                    'rgba(239, 68, 68, 1)',
                ],
                borderWidth: 2,
            }
        ]
    }
})

const chartOptions = {
    responsive: true,
    plugins: {
        legend: {
            position: 'top' as const,
        },
        title: {
            display: false,
        },
    },
    scales: {
        y: {
            beginAtZero: true,
        },
    },
}

const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom' as const,
        },
    },
}
</script>

<template>
    <div class="space-y-8">
        <div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                📊 Estadísticas del Curso
            </h2>
            
            <!-- Basic Stats Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <UCard v-for="stat in basicStats" :key="stat.label" class="text-center">
                    <div class="space-y-2">
                        <UIcon :name="stat.icon" :class="`w-8 h-8 mx-auto text-${stat.color}-500`" />
                        <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stat.value }}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">{{ stat.label }}</p>
                    </div>
                </UCard>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="statsPending" class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span class="ml-2 text-gray-600">Cargando estadísticas detalladas...</span>
        </div>

        <!-- Error State -->
        <UAlert 
            v-else-if="statsError"
            color="error" 
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
            title="Error cargando estadísticas"
            :description="statsError.statusMessage || 'No se pudieron cargar las estadísticas del curso'"
        />

        <!-- Charts and Detailed Stats -->
        <div v-else-if="courseStats" class="space-y-8">
            <!-- Overall Performance Metrics -->
            <UCard>
                <template #header>
                    <h3 class="text-lg font-semibold flex items-center gap-2">
                        <UIcon name="i-heroicons-chart-bar" class="w-5 h-5" />
                        Métricas Generales
                    </h3>
                </template>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p class="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {{ courseStats.overallAverageGrade }}
                        </p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Promedio General</p>
                    </div>
                    <div class="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p class="text-3xl font-bold text-green-600 dark:text-green-400">
                            {{ courseStats.overallCompletionRate }}%
                        </p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Tasa de Completación</p>
                    </div>
                    <div class="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <p class="text-3xl font-bold text-purple-600 dark:text-purple-400">
                            {{ courseStats.totalWorks }}
                        </p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Trabajos Asignados</p>
                    </div>
                </div>
            </UCard>

            <!-- Cell Performance Comparison -->
            <UCard v-if="cellPerformanceChartData">
                <template #header>
                    <h3 class="text-lg font-semibold flex items-center gap-2">
                        <UIcon name="i-heroicons-chart-bar-square" class="w-5 h-5" />
                        Rendimiento por Célula
                    </h3>
                </template>
                
                <div class="h-96">
                    <Bar :data="cellPerformanceChartData" :options="chartOptions" />
                </div>
            </UCard>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Grade Distribution -->
                <UCard v-if="gradeDistributionChartData">
                    <template #header>
                        <h3 class="text-lg font-semibold flex items-center gap-2">
                            <UIcon name="i-heroicons-academic-cap" class="w-5 h-5" />
                            Distribución de Calificaciones
                        </h3>
                    </template>
                    
                    <div class="h-96">
                        <Doughnut :data="gradeDistributionChartData" :options="doughnutOptions" />
                    </div>
                </UCard>

                <!-- Submission Status -->
                <UCard v-if="submissionStatusChartData">
                    <template #header>
                        <h3 class="text-lg font-semibold flex items-center gap-2">
                            <UIcon name="i-heroicons-document-check" class="w-5 h-5" />
                            Estado de Entregas
                        </h3>
                    </template>
                    
                    <div class="h-80">
                        <Doughnut :data="submissionStatusChartData" :options="doughnutOptions" />
                    </div>
                </UCard>
            </div>

            <!-- Detailed Cell Stats Table -->
            <UCard>
                <template #header>
                    <h3 class="text-lg font-semibold flex items-center gap-2">
                        <UIcon name="i-heroicons-table-cells" class="w-5 h-5" />
                        Análisis Detallado por Célula
                    </h3>
                </template>
                
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead class="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Célula
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estudiantes
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Promedio
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Completación
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tardíos
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                            <tr v-for="cell in courseStats.cells" :key="cell.cellId" class="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                    {{ cell.cellName }}
                                </td>
                                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {{ cell.studentCount }}
                                </td>
                                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span :class="[
                                        'px-2 py-1 rounded-full text-xs font-medium',
                                        cell.averageGrade >= 90 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                        cell.averageGrade >= 80 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                        cell.averageGrade >= 70 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                    ]">
                                        {{ cell.averageGrade }}
                                    </span>
                                </td>
                                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {{ cell.completionRate }}%
                                </td>
                                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span v-if="cell.lateSubmissions > 0" class="text-red-600 dark:text-red-400">
                                        {{ cell.lateSubmissions }}
                                    </span>
                                    <span v-else class="text-green-600 dark:text-green-400">0</span>
                                </td>
                                <td class="px-4 py-4 whitespace-nowrap">
                                    <div class="flex space-x-1">
                                        <span class="text-xs text-gray-500">
                                            {{ cell.workStats.submitted }}/{{ cell.workStats.total }}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </UCard>
        </div>
    </div>
</template>
