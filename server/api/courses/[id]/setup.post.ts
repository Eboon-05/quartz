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
    const userRecordId = new RecordId('user_profile', user.id)
    const courseRecordId = new RecordId('course', courseId)

    try {
        // --- Build Transaction ---
        let queries = `
            BEGIN TRANSACTION;

            -- 1. Create the relationship between the user and the course
            RELATE ${userRecordId}->manages->${courseRecordId} SET role = '${body.role}', createdAt = time::now();

            -- 2. Add the user to the corresponding array in the course record
            UPDATE ${courseRecordId} SET ${body.role === 'teacher' ? 'teachers' : 'coords'} += ${userRecordId};
        `

        // 3. If the user is a teacher, create their cell
        if (body.role === 'teacher' && body.students && body.students.length > 0) {
            const studentRecordIds = body.students.map((studentId: string) => new RecordId('user_profile', studentId))
            const cellData = {
                course: courseRecordId,
                teacher: userRecordId,
                students: studentRecordIds,
            }
            // Note: We create a new cell with a random ID.
            queries += `
            CREATE cell CONTENT ${JSON.stringify(cellData)};`
        }

        queries += `
            COMMIT TRANSACTION;
        `

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
