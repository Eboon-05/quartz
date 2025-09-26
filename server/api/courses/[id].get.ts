import { RecordId } from 'surrealdb'
import type { DBCourse, DBUser, DBCell } from '#shared/types/db'
import type { User } from '#shared/types/auth'

export default defineEventHandler(async (event) => {
    const courseId = getRouterParam(event, 'id')
    const { user } = event.context as { user: User | null }

    if (!courseId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Course ID is required.',
        })
    }

    const db = await getDB()

    const [courses, teachers, students, coords, cells, owners] = await db.query<
        [
            DBCourse[],
            { '<-is_teacher': { '<-user': DBUser[] } }[],
            { '<-is_student': { '<-user': DBUser[] } }[],
            { '<-is_coord': { '<-user': DBUser[] } }[],
            { '<-in_course': { '<-cell': DBCell[] } }[],
            { '<-is_owner': { '<-user': DBUser[] } }[],
        ]
    >(
        `
        SELECT * FROM $course;
        SELECT <-is_teacher<-user.* FROM $course;
        SELECT <-is_student<-user.* FROM $course;
        SELECT <-is_coord<-user.* FROM $course;
        SELECT <-in_course<-cell.* FROM $course;
        SELECT <-is_owner<-user.* FROM $course;
    `,
        {
            course: new RecordId('course', courseId),
        },
    )

    if (courses.length === 0) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Course not found in the database. It may need to be started from the dashboard.',
        })
    }

    const courseTeachers = teachers[0]['<-is_teacher']['<-user']
    let isTeacher = false
    let teacherCell: DBCell | null = null

    if (user && user.id) {
        const userId = new RecordId('user', user.id)
        isTeacher = courseTeachers.some(t => t.id.toString() === userId.toString())

        if (isTeacher) {
            const cellResult = await db.query<DBCell[][]>(
                'SELECT * FROM cell WHERE ->belongs_to->user CONTAINS $user AND ->in_course->course CONTAINS $course',
                {
                    user: userId,
                    course: new RecordId('course', courseId),
                },
            )
            teacherCell = cellResult[0]?.[0] ?? null

            if (teacherCell) {
                const cellStudentsResult = await db.query<[{'<-in_cell': {'<-user': DBUser[]}}[]]>(
                    'SELECT <-in_cell<-user.* FROM $cell',
                    {
                        cell: teacherCell.id,
                    },
                )
                teacherCell.students = cellStudentsResult[0]?.[0]?.['<-in_cell']?.['<-user'] ?? []
            }
        }
    }

    return {
        course: courses[0],
        teachers: courseTeachers,
        students: students[0]['<-is_student']['<-user'],
        coords: coords[0]['<-is_coord']['<-user'],
        cells: cells[0]['<-in_course']['<-cell'],
        owner: owners[0]['<-is_owner']['<-user'][0],
        isTeacher,
        teacherCell,
    }
})
