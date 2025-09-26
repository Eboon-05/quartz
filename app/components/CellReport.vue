<script setup lang="ts">
import { ref, computed, h, resolveComponent } from 'vue'
import type { RecordId } from 'surrealdb'
import type { DBUser } from '#shared/types/db'
import type { TableColumn } from '@nuxt/ui'

const UAvatar = resolveComponent('UAvatar')
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UProgress = resolveComponent('UProgress')

// Tipos basados en la respuesta real del endpoint
interface CellReportData {
    courseRecordId: RecordId<'course'>
    students: DBUser[]
    submissionsResult: Array<Array<{
        '->is_assigned': Array<{
            alternateLink: string
            grade: number
            id: RecordId<'is_assigned'>
            in: RecordId<'user'>
            out: RecordId<'work'>
            state: string
        }>
    }>>
    works: Array<{
        alternateLink: string
        description: string
        dueDate: {
            day: number
            month: number
            year: number
        }
        dueTime: {
            hours: number
            minutes: number
        }
        id: RecordId<'work'>
        maxPoints: number
        title: string
        workType: string
    }>
}

interface StudentWithStats {
    id: string
    name: string
    photoUrl: string | null
    totalSubmissions: number
    averageGrade: number | null
    submittedWorks: number
    totalWorks: number
    completionRate: string
}

interface WorkWithStatus {
    id: string
    title: string
    dueDate: string
    grade: string
    state: string
    maxPoints: number
}

const props = defineProps({
    cellId: {
        type: String,
        required: true,
    },
})

const { data: report, pending, error } = await useFetch<CellReportData>(`/api/cells/${props.cellId}/report`)

// Expandir filas
const selectedStudents = ref<string[]>([])

// Computar estadísticas de estudiantes
const studentsWithStats = computed<StudentWithStats[]>(() => {
    if (!report.value) return []
    
    return report.value.students.map((student) => {
        const studentSubmissions = report.value.submissionsResult
            .find((result) => result[0]?.['->is_assigned']?.some(sub => sub.in.toString() === student.id.toString()))
            ?.[0]?.['->is_assigned'] || []

        // Trabajos entregados: submitted, late, o cualquiera que tenga calificación
        const submittedWorks = studentSubmissions.filter(sub => 
            sub.state === 'submitted' || 
            sub.state === 'late' || 
            (sub.grade !== null && sub.grade !== undefined) // Si tiene calificación, fue entregado
        ).length

        // Para el promedio, considerar cualquier trabajo que tenga calificación
        const grades = studentSubmissions
            .filter(sub => sub.grade !== null && sub.grade !== undefined)
            .map(sub => sub.grade)

        const averageGrade = grades.length > 0 
            ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length 
            : null
        const totalWorks = report.value.works.length
        const completionRate = totalWorks > 0 
            ? `${Math.round((submittedWorks / totalWorks) * 100)}%` 
            : '0%'

        return {
            id: student.id.toString(),
            name: student.name,
            photoUrl: student.photoUrl || null,
            totalSubmissions: submittedWorks,
            averageGrade,
            submittedWorks,
            totalWorks,
            completionRate,
        }
    })
})

// Columnas para la tabla principal
const columns: TableColumn<StudentWithStats>[] = [
    {
        accessorKey: 'name',
        header: 'Estudiante',
        cell: ({ row }) => {
            const photoUrl = row.original.photoUrl
            return h('div', { class: 'flex items-center' }, [
                h(UAvatar, { 
                    alt: row.getValue('name'), 
                    src: photoUrl,
                    size: 'sm', 
                    class: 'mr-2' 
                }),
                h('span', { class: 'font-medium' }, row.getValue('name'))
            ])
        },
        enableSorting: false,
    },
    {
        accessorKey: 'submittedWorks',
        header: 'Trabajos Entregados',
        cell: ({ row }) => {
            return h('div', { class: 'flex items-center' }, [
                h('span', {}, row.getValue('submittedWorks')),
                h('span', { class: 'text-gray-400 ml-1' }, `/ ${row.original.totalWorks}`)
            ])
        },
        enableSorting: true,
    },
    {
        accessorKey: 'totalWorks',
        header: 'Total Trabajos',
        cell: ({ row }) => row.getValue('totalWorks'),
        enableSorting: true,
    },
    {
        accessorKey: 'completionRate',
        header: 'Porcentaje de Completitud',
        cell: ({ row }) => {
            const percentage = parseInt(row.getValue<string>('completionRate').replace('%', ''))
            return h('div', { class: 'flex items-center' }, [
                h(UProgress, {
                    modelValue: percentage,
                    max: 100,
                    size: 'sm',
                    class: 'w-16 mr-2'
                }),
                h('span', { class: 'text-sm' }, row.getValue('completionRate'))
            ])
        },
        enableSorting: true,
    },
    {
        accessorKey: 'averageGrade',
        header: 'Promedio',
        cell: ({ row }) => {
            const grade = row.getValue<number | null>('averageGrade')
            const color = grade !== null 
                ? (grade >= 7 ? 'success' : grade >= 5 ? 'warning' : 'error')
                : 'neutral'
            
            return h(UBadge, {
                color,
                variant: 'soft'
            }, () => formatGrade(grade))
        },
        enableSorting: true,
    },
    {
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => {
            const isExpanded = selectedStudents.value.includes(row.original.id)
            return h(UButton, {
                label: isExpanded ? 'Ocultar' : 'Ver Detalles',
                icon: isExpanded ? 'i-heroicons-eye-slash' : 'i-heroicons-eye',
                variant: 'ghost',
                size: 'xs',
                onClick: () => toggleStudentDetails(row.original.id)
            })
        },
        enableSorting: false,
        enableHiding: false,
    },
]

// Columnas para la tabla de trabajos
const workColumns: TableColumn<WorkWithStatus>[] = [
    {
        accessorKey: 'title',
        header: 'Trabajo',
        cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('title')),
        enableSorting: false,
    },
    {
        accessorKey: 'dueDate',
        header: 'Fecha Límite',
        cell: ({ row }) => h('span', { class: 'text-sm text-gray-600' }, row.getValue('dueDate')),
        enableSorting: true,
    },
    {
        accessorKey: 'grade',
        header: 'Calificación',
        cell: ({ row }) => {
            const grade = row.getValue<string>('grade')
            const color = grade === 'No entregado' || grade === 'N/A' 
                ? 'neutral' 
                : (parseFloat(grade) >= 7 ? 'success' : parseFloat(grade) >= 5 ? 'warning' : 'error')
            
            return h(UBadge, {
                color,
                variant: 'soft'
            }, () => grade)
        },
        enableSorting: true,
    },
    {
        accessorKey: 'state',
        header: 'Estado',
        cell: ({ row }) => {
            const state = row.getValue<string>('state')
            const color = getStateColor(state)
            const stateText = (() => {
                switch (state) {
                    case 'submitted': return 'Entregado'
                    case 'late': return 'Tarde'
                    case 'pending': return 'Pendiente'
                    case 'returned': return 'Devuelto'
                    case 'no-submitted': return 'No entregado'
                    default: return `Estado: ${state}` // Para debug
                }
            })()
            
            return h(UBadge, {
                color,
                variant: 'soft'
            }, () => stateText)
        },
        enableSorting: true,
    },
]

// Obtener detalles de trabajos para un estudiante
function getStudentWorks(studentId: string): WorkWithStatus[] {
    if (!report.value) return []
    
    const studentSubmissions = report.value.submissionsResult
        .find((result) => result[0]?.['->is_assigned']?.some(sub => sub.in.toString() === studentId))
        ?.[0]?.['->is_assigned'] || []

    return report.value.works.map((work): WorkWithStatus => {
        const submission = studentSubmissions.find(sub => sub.out.toString() === work.id.toString())
        
        return {
            id: work.id.toString(),
            title: work.title,
            dueDate: formatDueDate(work.dueDate, work.dueTime),
            grade: submission ? formatGrade(submission.grade) : 'No entregado',
            state: submission?.state || 'no-submitted',
            maxPoints: work.maxPoints,
        }
    })
}

function formatGrade(grade: number | null | undefined) {
    if (grade === null || grade === undefined) return 'N/A'
    return grade.toFixed(1)
}

function formatDueDate(dueDate: { day: number; month: number; year: number }, dueTime: { hours: number; minutes: number }) {
    const date = new Date(dueDate.year, dueDate.month - 1, dueDate.day, dueTime.hours, dueTime.minutes)
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function getStateColor(state: string) {
    switch (state) {
        case 'submitted': return 'info'      // Entregado, esperando calificación
        case 'late': return 'warning'        // Entregado tarde, esperando calificación
        case 'returned': return 'success'    // Entregado y calificado (devuelto)
        case 'pending': return 'neutral'     // Pendiente
        case 'no-submitted': return 'neutral' // No entregado
        default: return 'neutral'
    }
}

function toggleStudentDetails(studentId: string) {
    const index = selectedStudents.value.indexOf(studentId)
    if (index > -1) {
        selectedStudents.value.splice(index, 1)
    } else {
        selectedStudents.value.push(studentId)
    }
}

function closeStudentDetails(studentId: string) {
    const index = selectedStudents.value.indexOf(studentId)
    if (index > -1) {
        selectedStudents.value.splice(index, 1)
    }
}
</script>

<template>
    <div class="p-4">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">Informe de Rendimiento de la Célula</h2>
        </div>

        <UCard>
            <div v-if="pending" class="flex justify-center items-center py-8">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                    <p class="text-gray-500">Cargando informe...</p>
                </div>
            </div>

            <div v-else-if="error" class="p-4">
                <UAlert
                    icon="i-heroicons-exclamation-triangle"
                    color="error"
                    variant="soft"
                    title="Error"
                    :description="`Error al cargar el informe: ${error.message}`"
                />
            </div>

            <div v-else-if="report && studentsWithStats.length > 0">
                <!-- Resumen general -->
                <div class="mb-6">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <UCard>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-primary">
                                    {{ studentsWithStats.length }}
                                </div>
                                <div class="text-sm text-gray-500">
                                    Total Estudiantes
                                </div>
                            </div>
                        </UCard>
                        
                        <UCard>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-green-600">
                                    {{ report.works.length }}
                                </div>
                                <div class="text-sm text-gray-500">
                                    Total Trabajos
                                </div>
                            </div>
                        </UCard>
                        
                        <UCard>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-blue-600">
                                    {{ 
                                        studentsWithStats.filter(s => s.averageGrade !== null).length > 0 
                                        ? (studentsWithStats
                                            .filter(s => s.averageGrade !== null)
                                            .reduce((sum, s) => sum + (s.averageGrade || 0), 0) / 
                                           studentsWithStats.filter(s => s.averageGrade !== null).length
                                          ).toFixed(1)
                                        : 'N/A'
                                    }}
                                </div>
                                <div class="text-sm text-gray-500">
                                    Promedio General
                                </div>
                            </div>
                        </UCard>
                    </div>
                </div>

                <!-- Tabla principal con UTable -->
                <UTable
                    :data="studentsWithStats"
                    :columns="columns"
                    class="w-full"
                />

                <!-- Tablas expandidas para cada estudiante seleccionado -->
                <div v-for="studentId in selectedStudents" :key="studentId" class="mt-6">
                    <UCard>
                        <template #header>
                            <div class="flex justify-between items-center">
                                <h3 class="text-lg font-semibold">
                                    Detalle de Trabajos - {{ studentsWithStats.find(s => s.id === studentId)?.name }}
                                </h3>
                                <UButton
                                    icon="i-heroicons-x-mark"
                                    variant="ghost"
                                    size="xs"
                                    @click="closeStudentDetails(studentId)"
                                />
                            </div>
                        </template>

                        <UTable
                            :data="getStudentWorks(studentId)"
                            :columns="workColumns"
                        />
                    </UCard>
                </div>
            </div>

            <div v-else class="text-center py-12">
                <div class="text-gray-400 mb-2">
                    <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-1">
                    No hay datos disponibles
                </h3>
                <p class="text-gray-500">
                    No hay estudiantes en esta célula para generar un informe.
                </p>
            </div>
        </UCard>
    </div>
</template>