import { google } from 'googleapis'
import { getDB } from '../../utils/getDB'
import { RecordId } from 'surrealdb'

export default defineEventHandler(async (event) => {
    // El middleware 'auth' ya ha validado el token. Ahora creamos un cliente OAuth2
    // para realizar llamadas a la API de Google Classroom.
    const accessToken = getCookie(event, 'google_access_token')
    if (!accessToken) {
        // Esto no debería ocurrir si el middleware de autenticación funciona correctamente.
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized: No token provided.',
        })
    }

    const config = useRuntimeConfig()
    const oauth2client = new google.auth.OAuth2(
        config.public.googleClientId,
        config.googleClientSecret,
    )
    oauth2client.setCredentials({ access_token: accessToken })

    try {
        const classroom = google.classroom({
            version: 'v1',
            auth: oauth2client, // Usamos el cliente creado localmente.
        })

        const { data } = await classroom.courses.list({
            teacherId: 'me',
            courseStates: ['ACTIVE'],
        })

        const coursesFromClassroom = data.courses || []

        if (coursesFromClassroom.length === 0) {
            return { courses: [] }
        }

        const db = await getDB()

        const courses = await Promise.all(
            coursesFromClassroom.map(async (course) => {
                const dbCourse = await db.select(new RecordId('course', course.id!))

                return {
                    classroom: course,
                    db: dbCourse || null,
                }
            }),
        )

        return {
            courses,
        }
    } catch (error) {
        console.error('Error fetching Google Classroom courses:', error)

        // Este error podría ocurrir si los scopes del token no son suficientes para classroom.
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch courses from Google Classroom',
        })
    }
})
