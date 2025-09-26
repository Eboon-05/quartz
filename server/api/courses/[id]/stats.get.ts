import { RecordId } from 'surrealdb'

export interface CellStats {
    cellId: string
    cellName: string
    studentCount: number
    averageGrade: number
    completionRate: number
    lateSubmissions: number
    workStats: {
        total: number
        submitted: number
        graded: number
        pending: number
    }
    gradeDistribution: {
        excellent: number // 90-100
        good: number      // 80-89
        satisfactory: number // 70-79
        needs_improvement: number // < 70
    }
}

export interface CourseStats {
    totalStudents: number
    totalWorks: number
    overallCompletionRate: number
    overallAverageGrade: number
    cells: CellStats[]
    workProgress: {
        date: string
        submitted: number
        total: number
    }[]
    gradeDistribution: {
        range: string
        count: number
    }[]
}

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

        // 1. Get all cells from the course
        const [cellsResult] = await db.query<[any[]]>(
            `SELECT *, ->belongs_to->user.name as teacherName FROM cell WHERE ->is_from->course CONTAINS ${courseRecordId}`
        )

        const cells = cellsResult || []

        // 2. Get all works from the course
        const [worksResult] = await db.query<[any[]]>(
            `SELECT * FROM work WHERE ->is_from->course CONTAINS ${courseRecordId}`
        )

        const works = worksResult || []

        // 3. Get all students from the course
        const [studentsResult] = await db.query<[{ in: any }[]]>(
            `SELECT * FROM is_student WHERE out = ${courseRecordId} FETCH in`
        )

        const allStudents = studentsResult?.map(s => s.in) || []

        // 4. Calculate stats for each cell
        const cellStats: CellStats[] = await Promise.all(
            cells.map(async (cell: any) => {
                // Get students in this cell
                const [cellStudentsResult] = await db.query<[{ in: any }[]]>(
                    `SELECT * FROM is_in WHERE out = ${cell.id} FETCH in`
                )
                const cellStudents = cellStudentsResult?.map(s => s.in) || []

                // Get all submissions for this cell's students
                const studentIds = cellStudents.map(s => s.id)
                let totalSubmissions = 0
                let gradedSubmissions = 0
                let lateSubmissions = 0
                let totalGrade = 0
                let gradeDistribution = { excellent: 0, good: 0, satisfactory: 0, needs_improvement: 0 }

                if (studentIds.length > 0) {
                    const studentIdStrings = studentIds.map(id => `${id}`).join(', ')
                    const [submissionsResult] = await db.query<[any[]]>(
                        `SELECT * FROM is_assigned WHERE in IN [${studentIdStrings}]`
                    )

                    const submissions = submissionsResult || []
                    totalSubmissions = submissions.length

                    for (const submission of submissions) {
                        if (submission.grade !== null && submission.grade !== undefined) {
                            gradedSubmissions++
                            totalGrade += submission.grade
                            
                            if (submission.grade >= 90) gradeDistribution.excellent++
                            else if (submission.grade >= 80) gradeDistribution.good++
                            else if (submission.grade >= 70) gradeDistribution.satisfactory++
                            else gradeDistribution.needs_improvement++
                        }
                        
                        if (submission.late) {
                            lateSubmissions++
                        }
                    }
                }

                const expectedSubmissions = cellStudents.length * works.length
                const averageGrade = gradedSubmissions > 0 ? totalGrade / gradedSubmissions : 0
                const completionRate = expectedSubmissions > 0 ? (totalSubmissions / expectedSubmissions) * 100 : 0

                return {
                    cellId: cell.id.toString(),
                    cellName: cell.name,
                    studentCount: cellStudents.length,
                    averageGrade: Math.round(averageGrade * 100) / 100,
                    completionRate: Math.round(completionRate * 100) / 100,
                    lateSubmissions,
                    workStats: {
                        total: expectedSubmissions,
                        submitted: totalSubmissions,
                        graded: gradedSubmissions,
                        pending: expectedSubmissions - totalSubmissions
                    },
                    gradeDistribution
                }
            })
        )

        // 5. Calculate overall course stats
        const totalStudents = allStudents.length
        const totalWorks = works.length
        const totalExpectedSubmissions = totalStudents * totalWorks
        
        let totalSubmitted = 0
        let totalGraded = 0
        let overallTotalGrade = 0
        
        for (const cellStat of cellStats) {
            totalSubmitted += cellStat.workStats.submitted
            totalGraded += cellStat.workStats.graded
            overallTotalGrade += cellStat.averageGrade * cellStat.workStats.graded
        }

        const overallCompletionRate = totalExpectedSubmissions > 0 ? (totalSubmitted / totalExpectedSubmissions) * 100 : 0
        const overallAverageGrade = totalGraded > 0 ? overallTotalGrade / totalGraded : 0

        // 6. Create grade distribution for the course
        const gradeDistribution = [
            { range: 'Excelente (90-100)', count: cellStats.reduce((sum, cell) => sum + cell.gradeDistribution.excellent, 0) },
            { range: 'Bueno (80-89)', count: cellStats.reduce((sum, cell) => sum + cell.gradeDistribution.good, 0) },
            { range: 'Satisfactorio (70-79)', count: cellStats.reduce((sum, cell) => sum + cell.gradeDistribution.satisfactory, 0) },
            { range: 'Necesita Mejora (<70)', count: cellStats.reduce((sum, cell) => sum + cell.gradeDistribution.needs_improvement, 0) }
        ]

        const stats: CourseStats = {
            totalStudents,
            totalWorks,
            overallCompletionRate: Math.round(overallCompletionRate * 100) / 100,
            overallAverageGrade: Math.round(overallAverageGrade * 100) / 100,
            cells: cellStats,
            workProgress: [], // Could be implemented with time-series data
            gradeDistribution
        }

        return stats

    } catch (error) {
        console.error('Failed to fetch course stats:', error)
        const message = error instanceof Error ? error.message : 'An unknown error occurred.'
        throw createError({
            statusCode: 500,
            statusMessage: 'An error occurred while fetching course statistics.',
            data: message,
        })
    }
})
