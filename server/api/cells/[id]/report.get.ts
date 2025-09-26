import { PreparedQuery, type RecordId } from "surrealdb"
import type { DBUser } from "~~/shared/types/db"

export default defineEventHandler(async (event) => {
    const cellId = getRouterParam(event, 'id')
    if (!cellId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Cell ID is required',
        })
    }

    const db = await getDB()
    const cell = await db.select(cellId)
    if (!cell) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Cell not found',
        })
    }

    const [coursesResult, studentsResult] = await db.query<[
        [{
            "->is_from": {
                "->course": RecordId<'course'>[]
            }
        }],
        [{
            "<-is_in": {
                "<-user": DBUser[]
            }
        }]

    ]>(`
        SELECT ->is_from->course FROM cell:${cellId};
        SELECT <-is_in<-user.* FROM cell:${cellId};    
    `)

    const courseRecordId = coursesResult[0]['->is_from']['->course'][0]
    const students = studentsResult[0]['<-is_in']['<-user']

    const submissionsQuery = new PreparedQuery('')

    for (const student of students) {
        submissionsQuery.append([`SELECT ->is_assigned.* FROM ${student.id};`])
    }

    const submissionsResult = await db.query<[[
        {
            "->is_assigned": [
                {
                    alternateLink: string,
                    grade: number,
                    id: RecordId<'is_assigned'>,
                    in: RecordId<'user'>,
                    out: RecordId<'work'>,
                    state: string
                }
            ]
        }
    ]]>(submissionsQuery)

    const [[worksResult]] = await db.query<[[
        {
            "<-is_from": {
                "<-work": [
                    {
                        alternateLink: string,
                        description: string,
                        dueDate: {
                            day: number,
                            month: number,
                            year: number
                        },
                        dueTime: {
                            hours: number,
                            minutes: number
                        },
                        id: RecordId<'work'>,
                        maxPoints: number,
                        title: string,
                        workType: string
                    }
                ]
            }
        }
    ]]>(
        `SELECT <-is_from<-work.* FROM ${courseRecordId};`
    )

    console.log(worksResult)

    const works = worksResult['<-is_from']['<-work']

    return {
        courseRecordId,
        students,
        submissionsResult,
        works
    }
})