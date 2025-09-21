
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from "dotenv";

dotenv.config({
    path: "./.env",
    quiet: true,
});

if (!process.env.DATABASE_URL) {
    throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
    );
}

// Verbindungszeichenfolge für Entwicklungsumgebung anpassen
const safeConnectionString = process.env.DATABASE_URL.replace(
    /postgres:\/\/([^:]+):([^@]+)@/,
    'postgres://$1:***@'
);
console.log("Verbindung zur Datenbank mit:", safeConnectionString);



export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Datenbankverbindung fehlgeschlagen:', err.message);
    } else {
        console.log('✅ Datenbankverbindung erfolgreich:', res.rows[0].now);
    }
});

export async function resetDatabase() {
    if (process.env.NODE_ENV !== 'development') {
        console.error('❌ Datenbankrücksetzung nur im Entwicklungsmodus erlaubt');
        return false;
    }

    console.log('🔄 Leere alle Tabellen im Entwicklungsmodus...');

    try {
        // Ermittle alle Tabellen außer drizzle_migrations
        const tablesResult = await pool.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' AND tablename != 'drizzle_migrations'
        `);

        const tables = tablesResult.rows.map(row => row.tablename);

        // Temporär Foreign-Key-Constraints deaktivieren
        await pool.query('SET session_replication_role = replica;');

        // Tabellen leeren
        for (const table of tables) {
            await pool.query(`TRUNCATE TABLE "${table}" CASCADE`);
            console.log(`✓ Tabelle ${table} geleert`);
        }

        // Foreign-Key-Constraints wieder aktivieren
        await pool.query('SET session_replication_role = DEFAULT;');

        console.log('✅ Alle Tabellen erfolgreich zurückgesetzt');
        return true;
    } catch (error) {
        console.error('❌ Fehler beim Zurücksetzen der Datenbank:', error);
        return false;
    }
}

export const db = drizzle({ client: pool, schema });