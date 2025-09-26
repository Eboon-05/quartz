import { RecordId } from 'surrealdb'

export default defineEventHandler(async (event) => {
    const courseId = getRouterParam(event, 'id')
    const { user } = event.context

    if (!courseId) {
        throw createError({ statusCode: 400, statusMessage: 'Course ID is required.' })
    }
    if (!user?.id) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' })
    }

    const db = await getDB()

    try {
        const courseRecordId = new RecordId('course', courseId)
        const userRecordId = new RecordId('user', user.id)

        // Check if the user is already a teacher or coordinator
        const [existingRoles] = await db.query<[{ id: RecordId }[]]>(
            'SELECT * FROM is_teacher, is_coord WHERE in = $user AND out = $course',
            {
                user: userRecordId,
                course: courseRecordId,
            },
        )

        if (existingRoles.length > 0) {
            throw createError({ statusCode: 409, statusMessage: 'User already has a role in this course.' })
        }

        // Create the is_teacher relationship
        await db.query('RELATE $user->is_teacher->$course', {
            user: userRecordId,
            course: courseRecordId,
        })

        return { success: true, role: 'teacher' }
    } catch (error) {
        console.error('Failed to set user as teacher:', error)
        if (error instanceof Error && 'statusCode' in error) {
            throw error // Re-throw existing HTTP errors
        }
        throw createError({ statusCode: 500, statusMessage: 'Could not set user role.' })
    }
})
