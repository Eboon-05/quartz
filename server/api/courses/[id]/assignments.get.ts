import { google } from 'googleapis'

export default defineEventHandler(async (event) => {
    const courseId = getRouterParam(event, 'id')
    const { oauth2client, user } = event.context

    if (!courseId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Course ID is required.',
        })
    }

    if (!oauth2client) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Authentication client is not available.',
        })
    }

    if (!user?.id) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized: User information is missing.',
        })
    }

    try {
        const classroom = google.classroom({ version: 'v1', auth: oauth2client })
        
        // Obtener todas las tareas del curso
        const courseworkResponse = await classroom.courses.courseWork.list({
            courseId,
        })

        const coursework = courseworkResponse.data.courseWork || []

        if (coursework.length === 0) {
            return { assignments: [] }
        }

        // Para cada tarea, obtener la submisión del estudiante
        const assignments = await Promise.all(
            coursework.map(async (work) => {
                try {
                    // Obtener la submisión del estudiante para esta tarea
                    const submissionResponse = await classroom.courses.courseWork.studentSubmissions.list({
                        courseId,
                        courseWorkId: work.id!,
                        userId: 'me',
                    })

                    const submission = submissionResponse.data.studentSubmissions?.[0]

                    // Determinar el estado basado en la submisión y fechas
                    let status: 'pending' | 'in_progress' | 'completed' | 'overdue' = 'pending'
                    let grade: number | undefined

                    if (submission) {
                        switch (submission.state) {
                            case 'NEW':
                            case 'CREATED':
                                status = 'pending'
                                break
                            case 'TURNED_IN':
                                status = submission.assignedGrade ? 'completed' : 'in_progress'
                                break
                            case 'RETURNED':
                                status = 'completed'
                                grade = submission.assignedGrade || undefined
                                break
                        }

                        // Verificar si está atrasada
                        if (work.dueDate && status === 'pending') {
                            const dueDate = new Date(
                                work.dueDate.year!,
                                work.dueDate.month! - 1,
                                work.dueDate.day!,
                                work.dueTime?.hours || 23,
                                work.dueTime?.minutes || 59
                            )
                            if (new Date() > dueDate) {
                                status = 'overdue'
                            }
                        }
                    }

                    // Determinar prioridad basada en la fecha de vencimiento
                    let priority: 'high' | 'medium' | 'low' = 'medium'
                    if (work.dueDate) {
                        const dueDate = new Date(
                            work.dueDate.year!,
                            work.dueDate.month! - 1,
                            work.dueDate.day!,
                            work.dueTime?.hours || 23,
                            work.dueTime?.minutes || 59
                        )
                        const now = new Date()
                        const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                        
                        if (daysUntilDue <= 2) {
                            priority = 'high'
                        } else if (daysUntilDue <= 7) {
                            priority = 'medium'
                        } else {
                            priority = 'low'
                        }
                    }

                    // Construir fecha de vencimiento
                    let dueDate: string | undefined
                    if (work.dueDate) {
                        dueDate = new Date(
                            work.dueDate.year!,
                            work.dueDate.month! - 1,
                            work.dueDate.day!,
                            work.dueTime?.hours || 23,
                            work.dueTime?.minutes || 59
                        ).toISOString()
                    }

                    return {
                        id: work.id!,
                        title: work.title || 'Tarea sin título',
                        description: work.description || 'Sin descripción',
                        dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días desde ahora como fallback
                        status,
                        priority,
                        grade,
                    }
                } catch (error) {
                    console.error(`Error processing coursework ${work.id}:`, error)
                    // Devolver una versión simplificada en caso de error
                    return {
                        id: work.id!,
                        title: work.title || 'Tarea sin título',
                        description: work.description || 'Sin descripción',
                        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        status: 'pending' as const,
                        priority: 'medium' as const,
                    }
                }
            })
        )

        return {
            assignments: assignments.filter(Boolean), // Filtrar elementos nulos/undefined
        }
    } catch (error) {
        console.error('Error fetching student assignments:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch assignments from Google Classroom',
            data: {
                error: process.env.NODE_ENV === 'development' ? error : undefined,
            }
        })
    }
})
