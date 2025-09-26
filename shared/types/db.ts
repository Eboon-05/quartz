import type { RecordId } from "surrealdb"

export interface DBUser {
    id: RecordId,
    name: string,
    email: string,
    photoUrl: string,
}

export interface DBCourse {
    id: RecordId,
    name: string,
    created_at: Date,
    last_updated: Date,
}

export interface DBCell {
    id: RecordId,
    name: string
}