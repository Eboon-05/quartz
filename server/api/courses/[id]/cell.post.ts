import { RecordId } from 'surrealdb'
import { getDB } from '#server/utils/getDB'
import type { Cell as DBCell } from '#shared/types/db'

export default defineEventHandler(async (event) => {
    const courseId = getRouterParam(event, 'id')
    const { user } = event.context
    const { cellName, students: studentIds } = await readBody(event)

    if (!courseId) {
        throw createError({ statusCode: 400, statusMessage: 'Course ID is required.' })
    }
    if (!user?.id) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' })
    }
    if (!cellName || !Array.isArray(studentIds)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid input: cellName and students are required.' })
    }

    const db = await getDB()

    try {
        const courseRecordId = new RecordId('course', courseId)
        const userRecordId = new RecordId('user', user.id)

        // 1. Find if a cell already exists for this teacher in this course
        const [existingCells] = await db.query<[DBCell[]]>(
            `SELECT * FROM cell WHERE ->belongs_to->user CONTAINS $user AND ->is_from->course CONTAINS $course`,
            {
                user: userRecordId,
                course: courseRecordId,
            }
        )

        let cell: DBCell

        if (existingCells && existingCells.length > 0) {
            // 2a. If cell exists, update it
            cell = existingCells[0]
            await db.merge(cell.id, { name: cellName })

            // Remove all existing student relationships for this cell
            await db.query(`DELETE is_in WHERE out = $cell`, { cell: cell.id })

        } else {
            // 2b. If cell does not exist, create it
            const [newCell] = await db.create('cell', {
                name: cellName,
            })
            cell = newCell as unknown as DBCell // We need the full cell object with ID

            // Relate the new cell to the teacher and the course
            await db.query(
                'RELATE $cell->belongs_to->$user; RELATE $cell->is_from->$course;',
                {
                    cell: cell.id,
                    user: userRecordId,
                    course: courseRecordId,
                }
            )
        }

        // 3. Create the new relationships for the selected students
        if (studentIds.length > 0) {
            const studentRecordIds = studentIds.map((id: string) => new RecordId('user', id))
            let relateQuery = ''
            const params: Record<string, RecordId> = { cell: cell.id }

            studentRecordIds.forEach((studentId: RecordId, index: number) => {
                const paramName = `student${index}`
                relateQuery += `RELATE ${paramName}->is_in->$cell; `
                params[paramName] = studentId
            })

            await db.query(relateQuery, params)
        }

        return { success: true, cellId: cell.id }
    } catch (error) {
        console.error('Failed to save cell:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'An error occurred while saving the cell.',
        })
    }
})