import 'dotenv/config'
import bcrypt from 'bcryptjs'
import pg from 'pg'
const { Pool } = pg

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  
  // Seed Platform-level Dooper Admin
  const dooperEmail = 'dooperadmin@sclevo.com'
  const dooperPassword = 'Dooper@2026'
  const hashedDooper = await bcrypt.hash(dooperPassword, 12)

  await pool.query(
    `INSERT INTO "DooperAdmin" (id, name, email, password, "plainPassword", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
     ON CONFLICT (email) 
     DO UPDATE SET password = $4, "plainPassword" = $5, "isActive" = true`,
    ['dooper_admin_root', 'Sclevo Dooper Admin', dooperEmail, hashedDooper, dooperPassword]
  )

  console.log('✅ Dooper Admin seeded successfully!')
  console.log(`   Email: ${dooperEmail}`)
  console.log(`   Password: ${dooperPassword}`)
  console.log(`   URL: /dooper-admin`)

  await pool.end()
}

main().catch(e => {
  console.error('SEED FAILED:', e.message)
  process.exit(1)
})
