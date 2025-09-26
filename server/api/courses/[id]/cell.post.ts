import { RecordId } from 'surrealdb'
import type { User } from '#shared/types/auth'
import type { DBCell } from '#shared/types/db'

export default defineEventHandler(async (event) => {
    const courseId = getRouterParam(event, 'id')
    const { user } = event.context as { user: User }
    const body = await readBody(event)

    if (!courseId) {
        throw createError({ statusCode: 400, statusMessage: 'Course ID is required.' })
    } else if (!user || !user.id) {
        throw createError({ statusCode: 401, statusMessage: 'User not authenticated.' })
    } else if (!body.students) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid or missing students.' })
    } else if (!body.cellName) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid or missing cell name.' })
    }

    const db = await getDB()

    const [existingCell] = await db.query(
        `SELECT <-belongs_to<-cell.* FROM ${new RecordId('user', user.id)};`
    ) as DBCell[][]

    if (existingCell.length > 0) {
        await db.delete(existingCell[0].id)
    }

    const cell = (await db.create('cell', {
        name: body.cellName,
    }))[0] as { id: RecordId }

    let query = `
        RELATE ${cell.id}->belongs_to->${new RecordId('course', courseId)};
        RELATE ${cell.id}->in_course->${new RecordId('course', courseId)};
    `

    for (const studentId of body.students) {
        query += `
            RELATE ${new RecordId('user', studentId)}->in_cell->${cell.id};
        `
    }

    try {
        await db.query(query)
    } catch (error) {
        console.error(error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to save cell to the database.',
        })
    }
})