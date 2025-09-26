import type { RecordId } from "surrealdb"

// Interfaz para el objeto de usuario que se repite en la respuesta
export interface DBUser {
    id: RecordId<'user'>
    email: string
    name: string
    photoUrl: string
}

// Interfaz para el objeto de curso
export interface DBCourse {
    id: RecordId<'course'>
    created_at: string
    last_updated: string
    name: string
}
export interface DBCell {
    id: RecordId<'cell'>,
    name: string
}