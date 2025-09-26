import { google } from 'googleapis'
import { RecordId } from 'surrealdb'
import type { DBUser } from '../../../../shared/types/db'

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
        const db = await getDB()
        const classroom = google.classroom({ version: 'v1', auth: oauth2client })
        const courseRecordId = new RecordId('course', courseId)
        const userId = new RecordId('user', user.id)
        
        // 1. Verificar que el curso existe y obtener roles del usuario
        const [
            [course],
            teachersResult,
            studentsResult,
        ] = await Promise.all([
            db.query<[Array<{ id: string, name: string }>[]]>(`SELECT * FROM ${courseRecordId}`),
            db.query<[{ in: DBUser }[]]>(`SELECT * FROM is_teacher WHERE out = ${courseRecordId} FETCH in`),
            db.query<[{ in: DBUser }[]]>(`SELECT * FROM is_student WHERE out = ${courseRecordId} FETCH in`),
        ])
        
        if (!course) {
            throw createError({ statusCode: 404, statusMessage: 'Course not found.' })
        }
        
        const teachers = teachersResult[0]?.map(t => t.in) || []
        const students = studentsResult[0]?.map(s => s.in) || []
        
        const isTeacher = teachers.some(t => t && t.id && t.id.toString() === userId.toString())
        const isStudent = students.some(s => s && s.id && s.id.toString() === userId.toString())
        
        if (!isTeacher && !isStudent) {
            throw createError({ statusCode: 403, statusMessage: 'Not authorized to view this course.' })
        }
        
        // 2. Obtener todas las tareas del curso desde Google Classroom
        const courseworkResponse = await classroom.courses.courseWork.list({
            courseId,
        })

        const coursework = courseworkResponse.data.courseWork || []

        if (coursework.length === 0) {
            return { assignments: [] }
        }

        // 3. Para cada tarea, obtener información relevante
        const assignments = await Promise.all(
            coursework.map(async (work) => {
                try {
                    let status: 'pending' | 'in_progress' | 'completed' | 'overdue' = 'pending'
                    let grade: number | undefined
                    
                    // Solo obtener submisiones si el usuario es estudiante
                    if (isStudent) {
                        // Obtener la submisión del estudiante para esta tarea
                        const submissionResponse = await classroom.courses.courseWork.studentSubmissions.list({
                            courseId,
                            courseWorkId: work.id!,
                            userId: 'me',
                        })

                        const submission = submissionResponse.data.studentSubmissions?.[0]

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
                            if (work.dueDate && (status === 'pending' || status === 'in_progress')) {
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
                        dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        status,
                        grade,
                    }
                } catch (error) {
                    console.error(`Error processing coursework ${work.id}:`, error)
                    return {
                        id: work.id!,
                        title: work.title || 'Tarea sin título',
                        description: work.description || 'Sin descripción',
                        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        status: 'pending' as const,
                    }
                }
            })
        )

        // 4. Filtrar y ordenar assignments
        const validAssignments = assignments.filter(Boolean)
        
        // Si es estudiante, filtrar solo tareas pendientes, en progreso u overdue para la vista de alumno
        const filteredAssignments = isStudent 
            ? validAssignments.filter(a => ['pending', 'in_progress', 'overdue'].includes(a.status))
            : validAssignments
        
        // Ordenar por fecha de vencimiento
        const sortedAssignments = filteredAssignments.sort((a, b) => {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        })

        return {
            assignments: sortedAssignments,
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
