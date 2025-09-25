import { Surreal } from 'surrealdb';
import { surrealdbNodeEngines } from '@surrealdb/node';

export const getDB = async () => {
    const db = new Surreal({
        engines: surrealdbNodeEngines(),
    })

    await db.connect(process.env.SURREAL_URL!, {
        auth: {
            username: process.env.SURREAL_USER!,
            password: process.env.SURREAL_PASS!,
        }
    })

    await db.use({
        namespace: process.env.SURREAL_NS!,
        database: process.env.SURREAL_DB!,
    })

    return db;
}
