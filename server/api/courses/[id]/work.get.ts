import { google } from 'googleapis'
import { PreparedQuery, RecordId } from 'surrealdb'

export default defineEventHandler(async (event) => {
    const courseId = getRouterParam(event, 'id')
    const { oauth2client } = event.context

    if (!courseId) {
        throw createError({ statusCode: 400, statusMessage: 'Course ID is required.' })
    }
    if (!oauth2client) {
        throw createError({ statusCode: 500, statusMessage: 'Authentication client is not available.' })
    }

    const classroom = google.classroom({ version: 'v1', auth: oauth2client })

    try {
        // 1. Fetch all coursework from the Google Classroom API.
        const courseWorkResponse = await classroom.courses.courseWork.list({ courseId })
        const courseWork = courseWorkResponse.data.courseWork || []

        if (courseWork.length === 0) {
            return { courseWork: [] }
        }

        // 2. For each piece of coursework, fetch its student submissions.
        const courseWorkWithSubmissions = await Promise.all(
            courseWork.map(async (work) => {
                if (!work.id) return { ...work, submissions: [] }

                const submissionsResponse = await classroom.courses.courseWork.studentSubmissions.list({
                    courseId,
                    courseWorkId: work.id,
                })

                return {
                    ...work,
                    submissions: submissionsResponse.data.studentSubmissions || [],
                }
            })
        )

        const db = await getDB()

        for (const work of courseWorkWithSubmissions) {
            db.upsert(new RecordId('course_work', work.id!), {
                title: work.title,
                description: work.description,
                workType: work.workType,
                dueDate: work.dueDate,
                dueTime: work.dueTime,
                maxPoints: work.maxPoints,
                alternateLink: work.alternateLink,
            })

            const query = new PreparedQuery('')

            for (const submission of work.submissions) {
                query.append([`
                    RELATE ${new RecordId('user', submission.userId!)}->is_assigned->${new RecordId('course_work', work.id!)} CONTENT {
                        state: "${submission.state}",
                        grade: ${submission.assignedGrade},
                        late: ${submission.late},
                        alternateLink: ${submission.alternateLink},
                    };
                `])
            }

            await db.query(query)
        }

        // 3. Return the combined data.
        return {
            courseWork: courseWorkWithSubmissions,
        }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Failed to fetch coursework data:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'An error occurred while fetching data from Google Classroom.',
            data: error.message,
        })
    }
})
