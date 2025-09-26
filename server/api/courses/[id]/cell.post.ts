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

    const existingCellResult = await db.query<[{
        '<-belongs_to': {
            '<-cell': DBCell[]
        }
    }[]]>(
        `SELECT <-belongs_to<-cell.* FROM ${new RecordId('user', user.id)};`
    )

    const cellToDelete = existingCellResult[0]?.[0]?.['<-belongs_to']?.['<-cell']?.[0];

    if (cellToDelete) {
        await db.delete(cellToDelete.id);
    }

    const cell = (await db.create('cell', {
        name: body.cellName,
    }))[0] as { id: RecordId }

    let query = `
        RELATE ${cell.id}->belongs_to->${new RecordId('user', user.id)};
        RELATE ${cell.id}->is_from->${new RecordId('course', courseId)};
    `

    for (const studentId of body.students) {
        query += `
            RELATE ${studentId}->is_in->${cell.id};
        `
    }

    try {
        await db.query(query)

        return cell
    } catch (error) {
        console.error(error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to save cell to the database.',
        })
    }
})