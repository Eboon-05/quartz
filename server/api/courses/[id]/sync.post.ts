import { google } from 'googleapis'
import { RecordId } from 'surrealdb'

/**
 * This endpoint synchronizes the list of teachers and students from Google Classroom
 * into the local SurrealDB `user_profile` table.
 * This is a heavy operation and should be triggered manually.
 */
export default defineEventHandler(async (event) => {
    const courseId = getRouterParam(event, 'id')
    const { user, oauth2client } = event.context

    if (!courseId) {
        throw createError({ statusCode: 400, statusMessage: 'Course ID is required.' })
    }
    if (!oauth2client) {
        throw createError({ statusCode: 500, statusMessage: 'Authentication client is not available.' })
    }

    const db = await getDB()

    // 1. Verify permissions: Only the course owner can sync.
    const dbCourse = await db.select(new RecordId('course', courseId))
    if (!dbCourse || dbCourse.ownerId !== user.id) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden: You are not the owner of this course.' })
    }

    const classroom = google.classroom({ version: 'v1', auth: oauth2client })

    try {
        // 2. Fetch all teachers and students from Google Classroom API.
        const [teachersResponse, studentsResponse] = await Promise.all([
            classroom.courses.teachers.list({ courseId }),
            classroom.courses.students.list({ courseId }),
        ])

        const classroomTeachers = teachersResponse.data.teachers || []
        const classroomStudents = studentsResponse.data.students || []

        // 3. Use a transaction to update the database efficiently.
        const profilesToSync = [...classroomTeachers, ...classroomStudents]
        
        if (profilesToSync.length === 0) {
            return { message: 'No users to sync.', syncedTeachers: 0, syncedStudents: 0 }
        }

        // Using raw query for CREATE ... ON DUPLICATE KEY UPDATE
        const queries = profilesToSync.map(person => {
            if (!person.userId || !person.profile) return null
            
            const profileData = {
                id: new RecordId('user_profile', person.userId),
                fullName: person.profile.name?.fullName,
                email: person.profile.emailAddress,
                photoUrl: person.profile.photoUrl,
            }

            // This query creates a user profile if it doesn't exist, or updates it if it does.
            return `CREATE user_profile CONTENT ${JSON.stringify(profileData)} ON DUPLICATE KEY UPDATE fullName = '${profileData.fullName}', email = '${profileData.email}', photoUrl = '${profileData.photoUrl}';`
        }).filter(Boolean).join('\n')

        await db.query(queries)

        // 4. Return a summary.
        return {
            message: 'Sync successful!',
            syncedTeachers: classroomTeachers.length,
            syncedStudents: classroomStudents.length,
        }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Failed to sync course data:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'An error occurred while syncing with Google Classroom.',
        })
    }
})
