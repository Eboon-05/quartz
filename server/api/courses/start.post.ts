import { google } from 'googleapis'
import type { OAuth2Client } from 'googleapis-common'
import type { oauth2_v2 } from 'googleapis'
import { RecordId } from 'surrealdb'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    if (!body.courseId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'No course ID provided',
        })
    }

    // El middleware de autenticación ya ha verificado el token y adjuntado el usuario al contexto.
    let { user, oauth2client } = event.context

    if (!user || !user.id) {
        // Esto no debería ocurrir si el middleware está configurado correctamente.
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized: User information is missing.',
        })
    } else if (!oauth2client) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized: OAuth2 client is missing.',
        })
    }

    oauth2client = oauth2client as OAuth2Client
    user = user as oauth2_v2.Schema$Userinfo

    const classroom = google.classroom({
        version: 'v1',
        auth: oauth2client, // Usamos el cliente creado localmente.
    })

    const course = await classroom.courses.get({
        id: body.courseId
    })

    if (!course.data) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Error getting course.',
        })
    }

    const teachers = await classroom.courses.teachers.list({
        courseId: body.courseId
    })

    if (!teachers.data.teachers) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Error getting course teachers.',
        })
    }

    const students = await classroom.courses.students.list({
        courseId: body.courseId
    })

    if (!students.data.students) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Error getting course students.',
        })
    }

    const db = await getDB()

    const [dbCourse] = await db.upsert(`course`, {
        id: body.courseId,
    })

    await db.query(`
        RELATE ${new RecordId(`user`, user.id)}->is_owner->${dbCourse.id};
    `)

    let query = ''

    for (const teacher of teachers.data.teachers) {
        const fullName = `${teacher.profile?.name?.givenName} ${teacher.profile?.name?.familyName}`

        query += `
            UPSERT user CONTENT {
                id: "${teacher.userId}",
                name: "${fullName}",
                email: "${teacher.profile?.emailAddress}",
                photoUrl: "${teacher.profile?.photoUrl}",
            };
            RELATE ${new RecordId(`user`, teacher.userId!)}->is_teacher->${dbCourse.id};
        `
    }

    for (const student of students.data.students) {
        const fullName = `${student.profile?.name?.givenName} ${student.profile?.name?.familyName}`

        query += `
            UPSERT user CONTENT {
                id: "${student.userId}",
                name: "${fullName}",
                email: "${student.profile?.emailAddress}",
                photoUrl: "${student.profile?.photoUrl}",
            };
            RELATE ${new RecordId(`user`, student.userId!)}->is_student->${dbCourse.id};
        `
    }

    try {
        const result = await db.query(query)
        return {
            result
        }
    } catch (error) {
        console.error(error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Error cloning course into DB.',
        })
    }
})