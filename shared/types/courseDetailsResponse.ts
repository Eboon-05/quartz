import type { DBUser, DBCourse, DBCell } from './db'

// Interfaz principal que representa la respuesta completa y aplanada de la API
export interface CourseDetailsResponse {
    course: DBCourse
    teachers: DBUser[]
    coords: DBUser[]
    students: DBUser[]
    cells: DBCell[]
    owner: DBUser | null
    isTeacher: boolean
    isCoord: boolean
    isStudent: boolean
    teacherCell: DBCell | null
}