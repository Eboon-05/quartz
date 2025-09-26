import { RecordId } from 'surrealdb'

/**
 * This endpoint sets up a user's role (teacher or coordinator) for a specific course.
 * If the role is 'teacher', it also creates a 'cell' with their selected students.
 */
export default defineEventHandler(async (event) => {
    const courseId = getRouterParam(event, 'id')
    const { user } = event.context
    const body = await readBody(event)

    // --- Validation ---
    if (!courseId) {
        throw createError({ statusCode: 400, statusMessage: 'Course ID is required.' })
    }
    if (!user || !user.id) {
        throw createError({ statusCode: 401, statusMessage: 'User not authenticated.' })
    }
    if (!body.role || !['teacher', 'coordinator'].includes(body.role)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid or missing role.' })
    }

    const db = await getDB()

    // --- Prepare Record IDs ---
    const userRecordId = new RecordId('user', user.id)
    const courseRecordId = new RecordId('course', courseId)

    try {
        // --- Build Transaction ---
        let queries = `BEGIN TRANSACTION;`

        // 1. Create the relationship for the user's role
        if (body.role === 'teacher') {
            queries += `RELATE ${userRecordId}->is_teacher->${courseRecordId};`
        } else if (body.role === 'coordinator') {
            queries += `RELATE ${userRecordId}->is_coord->${courseRecordId};`
        }

        // 2. If the user is a teacher, create their cell and relate students
        if (body.role === 'teacher' && body.cellName && body.students && body.students.length > 0) {
            const cellId = `cell:${crypto.randomUUID()}`
            queries += `CREATE ${cellId} SET name = '${body.cellName}';`
            queries += `RELATE ${cellId}->is_from->${courseRecordId};`
            queries += `RELATE ${cellId}->belongs_to->${userRecordId};`

            for (const studentId of body.students) {
                const studentRecordId = new RecordId('user', studentId)
                queries += `RELATE ${studentRecordId}->is_in->${cellId};`
            }
        }

        queries += `COMMIT TRANSACTION;`

        // --- Execute Transaction ---
        await db.query(queries)

        return { success: true, message: 'User role and cell configured successfully.' }

    } catch (error) {
        console.error('Failed to configure user role in DB:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to save configuration to the database.',
        })
    }
})
