/**
 * Migration rollback - rolls back the last batch of migrations
 * Usage: npm run migrate:rollback
 * Options:
 *   --step=N  Roll back N migrations (default: all from last batch)
 *   --all     Roll back all migrations
 */

const fs = require('fs');
const path = require('path');
const { pool, query, getConnection } = require('.');
require('dotenv').config();

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function getLastBatch() {
    const result = await query('SELECT MAX(batch) as batch FROM migrations');
    return result[0].batch || 0;
}

async function getMigrationsToRollback(options) {
    let sql;
    let params = [];

    if (options.all) {
        sql = 'SELECT name, batch FROM migrations ORDER BY id DESC';
    } else if (options.step) {
        sql = 'SELECT name, batch FROM migrations ORDER BY id DESC LIMIT ?';
        params = [options.step];
    } else {
        const lastBatch = await getLastBatch();
        if (lastBatch === 0) {
            return [];
        }
        sql = 'SELECT name, batch FROM migrations WHERE batch = ? ORDER BY id DESC';
        params = [lastBatch];
    }

    return await query(sql, params);
}

async function rollback(options = {}) {
    console.log('Starting rollback...\n');

    try {
        // Check if migrations table exists
        const tables = await query(`
            SELECT TABLE_NAME
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'migrations'
        `, [process.env.DB_NAME || 'backgammon_cards']);

        if (tables.length === 0) {
            console.log('No migrations table found. Nothing to rollback.');
            return;
        }

        const migrations = await getMigrationsToRollback(options);

        if (migrations.length === 0) {
            console.log('No migrations to rollback.');
            return;
        }

        console.log(`Rolling back ${migrations.length} migration(s):\n`);

        for (const migration of migrations) {
            const filepath = path.join(MIGRATIONS_DIR, migration.name);

            if (!fs.existsSync(filepath)) {
                console.warn(`  ! Warning: Migration file not found: ${migration.name}`);
                console.warn('    Removing from migrations table anyway.\n');

                await query('DELETE FROM migrations WHERE name = ?', [migration.name]);
                continue;
            }

            console.log(`Rolling back: ${migration.name}`);

            const migrationModule = require(filepath);

            if (typeof migrationModule.down !== 'function') {
                throw new Error(`Migration ${migration.name} does not export a 'down' function`);
            }

            const connection = await getConnection();

            try {
                await connection.beginTransaction();

                // Run the rollback
                await migrationModule.down(connection);

                // Remove from migrations table
                await connection.execute(
                    'DELETE FROM migrations WHERE name = ?',
                    [migration.name]
                );

                await connection.commit();
                console.log(`  ✓ Rolled back: ${migration.name}\n`);
            } catch (error) {
                await connection.rollback();
                console.error(`  ✗ Failed: ${migration.name}`);
                throw error;
            } finally {
                connection.release();
            }
        }

        console.log('\nRollback completed successfully.');

    } catch (error) {
        console.error('\nRollback failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

for (const arg of args) {
    if (arg === '--all') {
        options.all = true;
    } else if (arg.startsWith('--step=')) {
        const step = parseInt(arg.replace('--step=', ''));
        if (!isNaN(step) && step > 0) {
            options.step = step;
        }
    }
}

rollback(options);
