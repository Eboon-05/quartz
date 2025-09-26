import { google } from 'googleapis'
import { RecordId } from 'surrealdb'

/**
 * This endpoint synchronizes the list of teachers and students from Google Classroom
 * into the local SurrealDB, including both user profiles and course relationships.
 * This is a heavy operation and should be triggered manually.
 */
export default defineEventHandler(async (event) => {
    const courseId = getRouterParam(event, 'id')
    const { user, oauth2client } = event.context

    if (!courseId) {
        throw createError({ statusCode: 400, statusMessage: 'Course ID is required.' })
    }
    if (!oauth2client) {
        throw createError({ statusCode: 500, statusMessage: 'Authentication client is not available.' })
    }

    const db = await getDB()

    // 1. Verify permissions: Any teacher of the course can sync.
    // Clean the courseId - remove 'course:' prefix if present and decode URL
    let cleanCourseId = decodeURIComponent(courseId)
    if (cleanCourseId.startsWith('course:')) {
        cleanCourseId = cleanCourseId.replace('course:', '')
    }
    // Remove the angle brackets if present
    cleanCourseId = cleanCourseId.replace(/^⟨|⟩$/g, '')
    
    const courseRecordId = new RecordId('course', cleanCourseId)
    const userRecordId = new RecordId('user', user.id)
    
    console.log('Sync permission check:', {
        userId: user.id,
        originalCourseId: courseId,
        cleanCourseId: cleanCourseId,
        userRecordId: userRecordId.toString(),
        courseRecordId: courseRecordId.toString()
    })
    
    // Check if user is a teacher of this course
    const [isTeacherResult] = await db.query<[{ in: string, out: string }[]]>(
        `SELECT * FROM is_teacher WHERE in = ${userRecordId} AND out = ${courseRecordId}`
    )
    
    console.log('Teacher check result:', {
        resultLength: isTeacherResult?.length || 0,
        result: isTeacherResult
    })
    
    // Also check if user is the owner as a fallback and get course info
    const dbCourse = await db.select(courseRecordId)
    if (!dbCourse) {
        throw createError({ statusCode: 404, statusMessage: 'Course not found.' })
    }
    
    const isOwner = dbCourse.ownerId === user.id
    
    console.log('Owner check:', {
        courseOwnerId: dbCourse.ownerId,
        userId: user.id,
        isOwner
    })
    
    if ((!isTeacherResult || isTeacherResult.length === 0) && !isOwner) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden: You must be a teacher or owner of this course to sync.' })
    }

    const classroom = google.classroom({ version: 'v1', auth: oauth2client })

    try {
        // 2. Fetch all teachers and students from Google Classroom API.
        console.log('Calling Classroom API with courseId:', cleanCourseId)
        const [teachersResponse, studentsResponse] = await Promise.all([
            classroom.courses.teachers.list({ courseId: cleanCourseId }),
            classroom.courses.students.list({ courseId: cleanCourseId }),
        ])

        const classroomTeachers = teachersResponse.data.teachers || []
        const classroomStudents = studentsResponse.data.students || []

        // 3. Sync user profiles
        const profilesToSync = [...classroomTeachers, ...classroomStudents]
        
        if (profilesToSync.length === 0) {
            return { message: 'No users to sync.', syncedTeachers: 0, syncedStudents: 0 }
        }

        // 4. Sync user profiles using native upsert
        const profilePromises = profilesToSync.map(async (person) => {
            if (!person.userId || !person.profile) return
            
            const profileRecordId = new RecordId('user_profile', person.userId)
            const profileData = {
                fullName: person.profile.name?.fullName || '',
                email: person.profile.emailAddress || '',
                photoUrl: person.profile.photoUrl || '',
            }

            return db.upsert(profileRecordId, profileData)
        })

        await Promise.all(profilePromises.filter(Boolean))

        // 5. Sync course relationships using native relate
        const relationshipPromises = []

        // Create teacher relationships
        for (const teacher of classroomTeachers) {
            if (teacher.userId) {
                const teacherRecordId = new RecordId('user', teacher.userId)
                relationshipPromises.push(
                    db.relate(teacherRecordId, 'is_teacher', courseRecordId, { created_at: new Date() })
                )
            }
        }

        // Create student relationships  
        for (const student of classroomStudents) {
            if (student.userId) {
                const studentRecordId = new RecordId('user', student.userId)
                relationshipPromises.push(
                    db.relate(studentRecordId, 'is_student', courseRecordId, { created_at: new Date() })
                )
            }
        }

        await Promise.all(relationshipPromises)

        // 6. Clean up old relationships that no longer exist in Classroom
        const currentTeacherIds = classroomTeachers
            .filter(t => t.userId)
            .map(t => new RecordId('user', t.userId!))
        
        const currentStudentIds = classroomStudents
            .filter(s => s.userId)
            .map(s => new RecordId('user', s.userId!))

        // Remove teacher relationships for users no longer teachers in Classroom
        if (currentTeacherIds.length > 0) {
            const teacherIdStrings = currentTeacherIds.map(id => `${id}`).join(', ')
            await db.query(
                `DELETE is_teacher WHERE out = ${courseRecordId} AND in NOT IN [${teacherIdStrings}]`
            )
        } else {
            // If no teachers, remove all teacher relationships for this course
            await db.query(`DELETE is_teacher WHERE out = ${courseRecordId}`)
        }

        // Remove student relationships for users no longer students in Classroom
        if (currentStudentIds.length > 0) {
            const studentIdStrings = currentStudentIds.map(id => `${id}`).join(', ')
            await db.query(
                `DELETE is_student WHERE out = ${courseRecordId} AND in NOT IN [${studentIdStrings}]`
            )
        } else {
            // If no students, remove all student relationships for this course
            await db.query(`DELETE is_student WHERE out = ${courseRecordId}`)
        }

        // 7. Return a comprehensive summary
        return {
            message: 'Sync successful!',
            syncedTeachers: classroomTeachers.length,
            syncedStudents: classroomStudents.length,
            totalUsers: profilesToSync.length,
            courseId: courseId,
        }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Failed to sync course data:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'An error occurred while syncing with Google Classroom.',
            data: error.message,
        })
    }
})
