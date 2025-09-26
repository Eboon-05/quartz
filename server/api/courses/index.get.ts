import { google } from 'googleapis'
import { getDB } from '../../utils/getDB'
import { RecordId } from 'surrealdb'
import type { classroom_v1 } from 'googleapis'

export default defineEventHandler(async (event) => {
    const { oauth2client } = event.context
    
    if (!oauth2client) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Authentication client is not available.',
        })
    }

    try {
        // Crear cliente de Google Classroom
        const classroom = google.classroom({ version: 'v1', auth: oauth2client })

        // Obtener todos los cursos donde el usuario es profesor o estudiante
        const [teacherCoursesResponse, studentCoursesResponse] = await Promise.all([
            // Cursos donde es profesor
            classroom.courses.list({
                teacherId: 'me',
                courseStates: ['ACTIVE'],
            }).catch(() => ({ data: { courses: [] } })),
            // Cursos donde es estudiante
            classroom.courses.list({
                studentId: 'me', 
                courseStates: ['ACTIVE'],
            }).catch(() => ({ data: { courses: [] } })),
        ])

        const teacherCourses = teacherCoursesResponse.data.courses || []
        const studentCourses = studentCoursesResponse.data.courses || []

        // Combinar cursos y eliminar duplicados, priorizando rol de profesor
        const allClassroomCourses = new Map<string, { course: classroom_v1.Schema$Course, role: 'teacher' | 'student' }>()

        // Primero agregar cursos como profesor (prioridad)
        teacherCourses.forEach(course => {
            if (course.id) {
                allClassroomCourses.set(course.id, { course, role: 'teacher' })
            }
        })

        // Luego agregar cursos como estudiante (solo si no existe como profesor)
        studentCourses.forEach(course => {
            if (course.id && !allClassroomCourses.has(course.id)) {
                allClassroomCourses.set(course.id, { course, role: 'student' })
            }
        })

        if (allClassroomCourses.size === 0) {
            return { courses: [] }
        }

        // Verificar cuáles cursos ya están configurados en la DB
        const db = await getDB()
        const coursesWithStatus = await Promise.all(
            Array.from(allClassroomCourses.values()).map(async ({ course, role }) => {
                const dbCourse = await db.select(new RecordId('course', course.id!)).catch(() => null)
                
                return {
                    classroom: {
                        id: course.id!,
                        name: course.name || 'Curso sin nombre',
                        section: course.section || 'Sin sección',
                        descriptionHeading: course.descriptionHeading || `${role === 'teacher' ? 'Enseñando' : 'Estudiando'} este curso`,
                        alternateLink: course.alternateLink,
                        courseState: course.courseState,
                    },
                    db: dbCourse,
                    role,
                }
            })
        )

        return {
            courses: coursesWithStatus,
        }
    } catch (error) {
        console.error('Error fetching Google Classroom courses:', error)

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch courses from Google Classroom',
            data: {
                error: process.env.NODE_ENV === 'development' ? error : undefined,
            }
        })
    }
})
