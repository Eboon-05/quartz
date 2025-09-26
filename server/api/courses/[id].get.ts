// This endpoint retrieves the full database record for a specific course.

import { RecordId } from "surrealdb"

export default defineEventHandler(async (event) => {
    const courseId = getRouterParam(event, 'id')

    if (!courseId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Course ID is required.',
        })
    }

    // The auth middleware already protects this route.
    const db = await getDB()

    // Fetch the course from the database.
    // SurrealDB's select method returns an array, so we expect one item.
    const course = await db.select(new RecordId('course', courseId))

    const [teachers, students, cells] = await db.query(`
        SELECT <-is_teacher<-user.* FROM ${course.id};
        SELECT <-is_student<-user.* FROM ${course.id};
        SELECT <-is_cell<-cell.* FROM ${course.id};
    `)

    if (!course) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Course not found in the database. It may need to be started from the dashboard.',
        })
    }

    return {
        course,
        teachers,
        students,
        cells,
    }
})
