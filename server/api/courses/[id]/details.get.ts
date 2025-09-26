import { RecordId } from 'surrealdb'
import type { CourseDetailsResponse } from '../../../../shared/types/courseDetailsResponse'
import type { DBCell, DBUser } from '../../../../shared/types/db'

export default defineEventHandler(async (event) => {
    const courseId = getRouterParam(event, 'id')
    const { user } = event.context

    if (!courseId) {
        throw createError({ statusCode: 400, statusMessage: 'Course ID is required.' })
    }
    if (!user?.id) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized: User information is missing.' })
    }

    const db = await getDB()

    try {
        const courseRecordId = new RecordId('course', courseId)

        // 1. Fetch the course itself to ensure it exists.
        const [[course]] = await db.query<[DBCourse[]]>(`SELECT * FROM ${courseRecordId}`);
        if (!course) {
            throw createError({ statusCode: 404, statusMessage: 'Course not found.' });
        }

        // 2. Fetch all related data in parallel.
        const [
            teachersResult,
            studentsResult,
            ownerResult,
            cellsResult,
        ] = await Promise.all([
            db.query<[{ in: DBUser }[]]>(`SELECT * FROM is_teacher WHERE out = ${courseRecordId} FETCH in`),
            db.query<[{ in: DBUser }[]]>(`SELECT * FROM is_student WHERE out = ${courseRecordId} FETCH in`),
            db.query<[{ in: DBUser }[]]>(`SELECT * FROM is_owner WHERE out = ${courseRecordId} FETCH in`),
            db.query<DBCell[]>(`SELECT * FROM cell WHERE ->is_from->course CONTAINS ${courseRecordId}`),
        ]);

        const teachers = teachersResult[0]?.map(t => t.in) || []
        const students = studentsResult[0]?.map(s => s.in) || []
        const owner = ownerResult[0]?.[0]?.in || null
        const rawCells = cellsResult || []

        // 3. Manually fetch students for each cell.
        const cells: DBCell[] = await Promise.all(rawCells.map(async (cell: DBCell) => {
            const [studentsForCell] = await db.query<[{ in: DBUser }[]]>(`SELECT * FROM is_in WHERE out = ${cell.id} FETCH in`);
            return {
                id: cell.id,
                name: cell.name,
                students: studentsForCell?.map(s => s.in) || [],
            }
        }));

        // 4. Determine user's role and their specific cell.
        const userId = new RecordId('user', user.id)
        const isTeacher = teachers.some(t => t && t.id && t.id.toString() === userId.toString())

        let teacherCell: DBCell | null = null
        if (isTeacher) {
            const [teacherCells] = await db.query<[DBCell[]]>(`SELECT * FROM cell WHERE ->belongs_to->user CONTAINS ${userId} AND ->is_from->course CONTAINS ${courseRecordId}`);
            if (teacherCells.length > 0) {
                const cell = teacherCells[0]
                const [studentsForCell] = await db.query<[DBUser[]]>(`SELECT <-is_in<-user.* FROM ${cell.id}`);
                teacherCell = {
                    ...cell,
                    students: studentsForCell || [],
                }
            }
        }

        // 5. Assemble the final response.
        const response: CourseDetailsResponse = {
            course,
            teachers,
            coords: [], // Coords logic not implemented yet
            students,
            cells,
            owner,
            isTeacher,
            teacherCell,
        }

        return response
    } catch (error) {
        console.error('Failed to fetch course details:', error)
        const message = error instanceof Error ? error.message : 'An unknown error occurred.'
        throw createError({
            statusCode: 500,
            statusMessage: 'An error occurred while fetching course details.',
            data: message,
        })
    }
})
