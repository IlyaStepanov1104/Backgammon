# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Backgammon Cards is a Telegram-integrated learning platform for backgammon (short nard) consisting of:
- **Telegram Bot**: Standalone bot using polling (not webhooks) for user interaction and access management
- **Next.js Web App**: Miniapp for users and admin panel for content management
- **MySQL Database**: Stores users, cards, promocodes, and access control

## Commands

### Development
```bash
npm run dev              # Start Next.js dev server (port 3000)
npm run bot              # Start Telegram bot with polling (run in separate terminal)
```

### Database Migrations
```bash
npm run migrate          # Run all pending migrations
npm run migrate:create -- <name>  # Create new migration (e.g., npm run migrate:create -- add_column)
npm run migrate:rollback          # Rollback last batch of migrations
npm run migrate:rollback --step=N # Rollback N migrations
npm run migrate:rollback --all    # Rollback all migrations
npm run test:db          # Test database connection and schema
```

### Testing
```bash
npm run test:bot         # Test bot functionality
npm run test:promocodes  # Test promocode API endpoints
```

### Production
```bash
npm run build            # Build Next.js for production
npm run start            # Start production server
```

### Setup
```bash
npm run setup            # Initial project setup (creates folders, copies env file)
```

## Architecture

### Project Structure

```
src/
├── app/                    # Next.js App Router (15+)
│   ├── admin/             # Admin panel pages
│   │   ├── cards/         # Card management UI
│   │   ├── users/         # User management UI
│   │   ├── promocodes/    # Promocode management UI
│   │   └── groups/        # User group management UI
│   ├── miniapp/           # User-facing miniapp
│   └── api/               # API routes
│       ├── admin/         # Admin API endpoints
│       ├── miniapp/       # Miniapp API endpoints
│       └── telegram/      # Telegram bot webhook (not used with polling)
├── bot/                   # Telegram bot (runs separately)
│   └── bot.js            # Main bot logic with polling
├── services/             # Shared services
│   ├── database.js       # MySQL connection pool and query helpers
│   ├── database/         # Database utilities
│   │   ├── migrate.js           # Migration runner
│   │   ├── migrate-create.js    # Migration file generator
│   │   ├── migrate-rollback.js  # Migration rollback
│   │   └── migrations/          # Migration files (timestamped)
│   └── s3.ts             # S3 file upload (if configured)
├── components/           # React components
├── hooks/                # React hooks
└── utils/                # Utility functions
```

### Database Layer

**Connection**: MySQL with connection pooling via `src/services/database.js`

**Key functions**:
- `query(sql, params)` - Execute parameterized queries
- `queryWithPagination(sql, params, limit, offset)` - Execute queries with pagination
- `getConnection()` - Get connection for transactions

**Schema**: The database uses the following main tables:
- `users` - Telegram users (telegram_id as unique key)
- `cards` - Learning cards with positions
- `promo_codes` - Promocodes for access control
- `promo_code_cards` - Many-to-many relationship between promocodes and cards
- `packages` - Purchasable packages of cards with prices
- `package_cards` - Many-to-many relationship between packages and cards
- `package_purchases` - Purchase history with payment tracking
- `user_card_access` - Tracks which users have access to which cards
- `user_favorites` - User-favorited cards
- `user_responses` - User responses to cards (response_status: 'correct'/'incorrect')
- `tags` - Tags for organizing cards
- `card_tags` - Many-to-many relationship between cards and tags
- `user_groups` - Groups of users
- `user_group_members` - Many-to-many relationship between groups and users
- `migrations` - System table tracking executed database migrations

**Important**: Always use parameterized queries to prevent SQL injection. The query helpers handle this automatically.

### Database Migrations

**Location**: `src/services/database/migrations/`

**Migration files** are named with timestamp prefix: `YYYYMMDD_HHMMSS_name.js`

**Structure**:
```javascript
/**
 * Run the migration
 * @param {import('mysql2/promise').Connection} connection
 */
async function up(connection) {
    await connection.execute(`
        CREATE TABLE example (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

/**
 * Reverse the migration
 * @param {import('mysql2/promise').Connection} connection
 */
async function down(connection) {
    await connection.execute('DROP TABLE IF EXISTS example');
}

module.exports = { up, down };
```

**How it works**:
- `migrations` table tracks executed migrations with batch numbers
- Each `npm run migrate` creates a new batch
- Rollback by default removes all migrations from the last batch
- Migrations run in transactions - if one fails, changes are rolled back

**Commands**:
- `npm run migrate` - Run pending migrations
- `npm run migrate:create -- add_users_email` - Create migration file
- `npm run migrate:rollback` - Rollback last batch
- `npm run migrate:rollback --step=3` - Rollback last 3 migrations
- `npm run migrate:rollback --all` - Rollback all migrations

### Telegram Bot Architecture

**Location**: `src/bot/bot.js`

**Mode**: Uses **polling** (not webhooks) - bot must run as separate process via `npm run bot`

**Key flows**:
1. `/start` command: Saves user to DB, checks access, shows miniapp button and "Buy Package" button
2. `/packages` command: Shows list of available packages for purchase
3. Promocode handling: Regex `/^[A-Z0-9]{6,20}$/` captures codes, validates and grants card access via transaction
4. Package purchase: User selects package → payment created via YooKassa → webhook processes successful payment → cards granted
5. User access: Checked via `user_card_access` table with expiration and active status

**Bot runs independently** of Next.js server and must be started separately.

### API Routes

**Authentication**: Admin endpoints use basic env-based auth (ADMIN_USERNAME/ADMIN_PASSWORD), not JWT

**Path alias**: `@/*` maps to `./src/*` (configured in jsconfig.json)

**Admin API** (`/api/admin/*`):
- `/login` - Admin authentication (username/password from env)
- `/cards` - Full CRUD for cards (GET, POST, PUT, DELETE)
- `/users` - User management and access control
- `/promocodes` - Full CRUD for promocodes with stats and validation
- `/packages` - Full CRUD for packages (GET, POST, PUT, DELETE)
- `/packages/[id]` - Get package details with cards
- `/tags` - Tag management
- `/groups` - User group management

**Miniapp API** (`/api/miniapp/*`):
- `/cards` - Get cards for user (with favorites/solved filtering)
- `/favorites` - Add/remove favorites
- `/packages` - Get list of available packages with purchase status

**Payment API** (`/api/payment/*`):
- `/create` - Create payment via YooKassa (returns payment URL)
- `/webhook` - Webhook handler for YooKassa payment notifications

### File Uploads

**Directory**: `public/uploads/cards/`

**Flow**: Files uploaded via multipart form data are saved with UUID names and returned as `/uploads/cards/{uuid}{ext}` paths

### Promocode System

**Features**:
- Bulk creation and management
- Usage tracking (current_uses vs max_uses)
- Expiration dates
- Card package assignments
- Statistics and validation endpoints

**Access granting**: When promocode is redeemed, entries are created in `user_card_access` for each card in the promocode's package. Uses transactions to ensure atomicity.

### Package System (Paid Access)

**Features**:
- Create packages with name, description, price, and card selection
- Purchase packages via YooKassa payment gateway
- Automatic card access granting after successful payment
- Purchase history tracking
- Integration with Telegram bot for seamless purchasing

**Payment flow**:
1. User selects package in bot (`/packages` or "Buy Package" button)
2. System creates `package_purchases` record with status='pending'
3. Payment created via YooKassa API, returns payment URL
4. User completes payment on YooKassa page
5. YooKassa sends webhook to `/api/payment/webhook`
6. System updates purchase status to 'succeeded' and grants card access
7. Cards automatically added to `user_card_access` for the user

**Configuration**: Requires `YOOKASSA_SHOP_ID` and `YOOKASSA_SECRET_KEY` in `.env`

## Development Patterns

### Database Queries

Always use parameterized queries:
```javascript
// Good
const users = await query('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);

// Bad - SQL injection risk
const users = await query(`SELECT * FROM users WHERE telegram_id = ${telegramId}`);
```

### Transactions

For operations that need atomicity (e.g., package creation, promocode redemption):
```javascript
let connection;
try {
  connection = await getConnection();

  // Set lock timeout and isolation level (important for remote connections)
  await connection.execute('SET innodb_lock_wait_timeout = 10');
  await connection.execute('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');

  await connection.beginTransaction();

  try {
    // Execute queries
    await connection.execute(sql1, params1);

    // Use batch insert for multiple rows (better performance, fewer locks)
    const values = ids.map(id => `(${parentId}, ${id})`).join(',');
    await connection.execute(`INSERT INTO table (parent_id, child_id) VALUES ${values}`);

    await connection.commit();
  } catch (error) {
    try {
      if (connection) {
        await connection.rollback();
      }
    } catch (rollbackError) {
      console.error('Rollback error:', rollbackError);
    }
    throw error;
  }
} catch (error) {
  console.error('Transaction error:', error);

  // Handle lock timeout specifically
  if (error.code === 'ER_LOCK_WAIT_TIMEOUT') {
    return NextResponse.json({
      error: 'Операция заблокирована другим процессом. Попробуйте еще раз.'
    }, { status: 409 });
  }

  throw error;
} finally {
  if (connection) {
    try {
      connection.release();
    } catch (releaseError) {
      console.error('Connection release error:', releaseError);
    }
  }
}
```

**Best practices for transactions:**
- Always use `let connection;` before try block
- Set lock timeout to prevent indefinite waiting
- Use READ COMMITTED isolation to reduce locks
- Use batch INSERT instead of loops for better performance
- Always rollback on errors with try-catch
- Always release connection in finally block
- Handle `ER_LOCK_WAIT_TIMEOUT` errors with user-friendly message

### Bot Development

When modifying bot logic, remember:
- Bot runs separately - changes require restarting `npm run bot`
- Polling errors are logged but don't crash the bot
- User data from Telegram: `msg.from.id`, `msg.from.username`, `msg.from.first_name`
- Use `checkUserAccess(telegramId)` to verify access before showing miniapp button

### Admin Panel

Authentication check in API routes:
```javascript
function checkAuth(request) {
  return true; // Currently always returns true - real session check can be added
}
```

Note: Despite README mentioning JWT, current implementation uses simple env-based credentials without session management.

## Configuration

### Required Environment Variables

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=backgammon_cards
DB_PORT=3306

TELEGRAM_BOT_TOKEN=your_bot_token
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username

ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin_password

NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Optional (Payment Integration)
```
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_secret_key
```

## Testing

- `test-bot.js` - Tests bot connection
- `test-db.js` - Tests database connection and verifies schema
- `test-promocodes-api.js` - Tests promocode endpoints

## Remote MySQL (VPS) Configuration

When working with MySQL on a remote VPS server:

### Server Configuration

Edit MySQL config on VPS (`/etc/mysql/mysql.conf.d/mysqld.cnf` or `/etc/my.cnf`):

```ini
[mysqld]
# Increase timeouts
wait_timeout = 600
interactive_timeout = 600
innodb_lock_wait_timeout = 50

# Reduce locking
transaction-isolation = READ-COMMITTED

# Increase packet size for batch inserts
max_allowed_packet = 64M

# Optimize for remote connections
max_connections = 200
```

Restart MySQL: `sudo systemctl restart mysql`

### SSH Tunnel (Recommended)

For stable remote connections, use SSH tunnel:

```bash
# In separate terminal
ssh -L 3307:localhost:3306 user@your-vps-ip -N

# In .env.local (don't commit to git!)
DB_HOST=127.0.0.1
DB_PORT=3307
```

### Troubleshooting Lock Timeouts

If you see "Lock wait timeout exceeded" errors:

1. **Find stuck transactions:**
   ```sql
   SELECT * FROM information_schema.innodb_trx;
   SELECT * FROM information_schema.innodb_lock_waits;
   ```

2. **Kill stuck process:**
   ```sql
   -- Find thread_id from above query
   KILL thread_id;
   ```

3. **Use the script:**
   ```bash
   mysql -u root -p < clear-mysql-locks.sql
   ```

See `docs/mysql-locks-troubleshooting.md` for detailed guide.

## Important Notes

1. **Two Separate Processes**: Next.js dev server AND Telegram bot must both run for full functionality
2. **No Webhooks**: Bot uses polling, not webhooks - simpler for development but requires separate process
3. **Database Migrations**: Full migration system available via `npm run migrate`, `migrate:create`, `migrate:rollback`
4. **File Storage**: Images stored locally in `public/uploads/` - consider cloud storage (S3) for production
5. **Admin Auth**: Current admin authentication is basic - session management can be enhanced
6. **Character Set**: Database should use `utf8mb4` collation for proper emoji/multilingual support
7. **Remote MySQL**: When using MySQL on VPS, configure timeouts and consider SSH tunnel for stability
