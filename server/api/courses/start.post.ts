import { google } from 'googleapis'
import type { OAuth2Client } from 'googleapis-common'
import type { oauth2_v2 } from 'googleapis'
import { RecordId, PreparedQuery } from 'surrealdb'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const courseId = body.courseId as string

    if (!courseId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'No course ID provided',
        })
    }

    const { user, oauth2client } = event.context as { user: oauth2_v2.Schema$Userinfo, oauth2client: OAuth2Client }

    if (!user?.id) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized: User information is missing.' })
    }
    if (!oauth2client) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized: OAuth2 client is missing.' })
    }

    const classroom = google.classroom({ version: 'v1', auth: oauth2client })
    const db = await getDB()

    try {
        // 1. Fetch course, teachers, and students from Google Classroom
        const [courseResponse, teachersResponse, studentsResponse, courseWorkResponse] = await Promise.all([
            classroom.courses.get({ id: courseId }),
            classroom.courses.teachers.list({ courseId }),
            classroom.courses.students.list({ courseId }),
            classroom.courses.courseWork.list({ courseId }),
        ])

        const courseData = courseResponse.data
        const teachers = teachersResponse.data.teachers || []
        const students = studentsResponse.data.students || []
        const courseWork = courseWorkResponse.data.courseWork || []

        // 2. Upsert course and owner relationship
        const [dbCourse] = await db.upsert(`course`, {
            id: courseId,
            name: courseData.name,
            created_at: new Date(),
            last_updated: new Date(),
        })
        await db.query(`RELATE ${new RecordId('user', user.id)}->is_owner->${dbCourse.id}`)

        // 3. Upsert users (teachers and students) and their relationships to the course
        let userQuery = ''
        for (const teacher of teachers) {
            if (!teacher.userId || !teacher.profile?.name?.givenName) continue
            const fullName = `${teacher.profile.name.givenName} ${teacher.profile.name.familyName || ''}`.trim()
            userQuery += `
                UPSERT user CONTENT { id: "${teacher.userId}", name: "${fullName}", email: "${teacher.profile.emailAddress}", photoUrl: "${teacher.profile.photoUrl}" };
                RELATE ${new RecordId('user', teacher.userId)}->is_teacher->${dbCourse.id};
            `
        }
        for (const student of students) {
            if (!student.userId || !student.profile?.name?.givenName) continue
            const fullName = `${student.profile.name.givenName} ${student.profile.name.familyName || ''}`.trim()
            userQuery += `
                UPSERT user CONTENT { id: "${student.userId}", name: "${fullName}", email: "${student.profile.emailAddress}", photoUrl: "${student.profile.photoUrl}" };
                RELATE ${new RecordId('user', student.userId)}->is_student->${dbCourse.id};
            `
        }
        if (userQuery) await db.query(userQuery)


        // 5. Fetch and store coursework and submissions
        const courseWorkWithSubmissions = await Promise.all(
            courseWork.map(async (work) => {
                if (!work.id) return null
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

        for (const work of courseWorkWithSubmissions) {
            if (!work || !work.id) continue
            const workId = new RecordId('work', work.id)

            await db.upsert(workId, {
                title: work.title,
                description: work.description,
                workType: work.workType,
                dueDate: work.dueDate,
                dueTime: work.dueTime,
                maxPoints: work.maxPoints,
                alternateLink: work.alternateLink,
            })

            // work -> is from -> course
            await db.query(`RELATE ${workId}->is_from->${dbCourse.id}`)

            const submissionQueries: string[] = []
            for (const submission of work.submissions) {
                if (!submission.userId) continue
                // user (students) -> is assigned -> work
                submissionQueries.push(
                    `RELATE ${new RecordId('user', submission.userId)}->is_assigned->${workId} CONTENT { state: "${submission.state}", grade: ${submission.assignedGrade}, late: ${submission.late}, alternateLink: "${submission.alternateLink}" };`
                )
            }
            if (submissionQueries.length > 0) {
                await db.query(new PreparedQuery(submissionQueries.join('\n')))
            }
        }

        return { success: true, message: 'Course cloned successfully.' }

    } catch (error: unknown) {
        console.error('Error cloning course:', error)
        const message = error instanceof Error ? error.message : 'An unknown error occurred.'
        throw createError({
            statusCode: 500,
            statusMessage: 'Error cloning course into DB.',
            data: message,
        })
    }
})