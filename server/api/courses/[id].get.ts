import { RecordId } from 'surrealdb'
import type { DBCourse, DBUser, DBCell } from '#shared/types/db'

export default defineEventHandler(async (event) => {
    const courseId = getRouterParam(event, 'id')

    if (!courseId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Course ID is required.',
        })
    }

    const db = await getDB()

    // Use FETCH to get the course and all related, flattened data in one go
    const [courses, teachers, students, coords, cells, owners] = await db.query<
        [
            DBCourse[],
            { '<-is_teacher': { '<-user': DBUser[] } }[],
            { '<-is_student': { '<-user': DBUser[] } }[],
            { '<-is_coord': { '<-user': DBUser[] } }[],
            { '<-in_course': { '<-cell': DBCell[] } }[],
            { '<-is_owner': { '<-user': DBUser[] } }[],
        ]
    >(`
        SELECT * FROM $course;
        SELECT <-is_teacher<-user.* FROM $course;
        SELECT <-is_student<-user.* FROM $course;
        SELECT <-is_coord<-user.* FROM $course;
        SELECT <-in_course<-cell.* FROM $course;
        SELECT <-is_owner<-user.* FROM $course;
    `,
        {
            course: new RecordId('course', courseId)
        }
    )

    if (courses.length === 0) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Course not found in the database. It may need to be started from the dashboard.',
        })
    }

    return {
        course: courses[0],
        teachers: teachers[0]['<-is_teacher']['<-user'],
        students: students[0]['<-is_student']['<-user'],
        coords: coords[0]['<-is_coord']['<-user'],
        cells: cells[0]['<-in_course']['<-cell'],
        owner: owners[0]['<-is_owner']['<-user'][0],
    }
})
