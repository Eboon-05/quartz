export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    if (!body.courseId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'No course ID provided',
        })
    }

    // El middleware de autenticación ya ha verificado el token y adjuntado el usuario al contexto.
    const { user } = event.context

    if (!user || !user.id) {
        // Esto no debería ocurrir si el middleware está configurado correctamente.
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized: User information is missing.',
        })
    }

    const db = await getDB()

    const [course] = await db.create(`course`, {
        id: body.courseId,
        ownerId: user.id,
    })

    return {
        course,
    }
})