import { google } from 'googleapis'

// This endpoint retrieves all students for a specific course.
// It is protected by the auth middleware, which ensures only authenticated users can access it.

export default defineEventHandler(async (event) => {
    // Nuxt automatically parses the [id] parameter from the file path.
    const courseId = getRouterParam(event, 'id')

    if (!courseId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Course ID is required.',
        })
    }

    // The oauth2client is attached to the context by our auth middleware.
    const { oauth2client } = event.context

    if (!oauth2client) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Authentication client is not available.',
        })
    }

    try {
        // Create a Google Classroom API client.
        const classroom = google.classroom({ version: 'v1', auth: oauth2client })

        // Fetch the list of students for the specified course.
        const response = await classroom.courses.students.list({
            courseId,
        })

        const students = response.data.students || []

        return {
            students,
        }
    } catch (error) {
        console.error('Failed to fetch students from Google Classroom:', error)
        // Forward the error from Google API if possible, or send a generic one.
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch students.',
            data: {
                error: process.env.NODE_ENV === 'development' ? error : undefined,
            }
        })
    }
})

