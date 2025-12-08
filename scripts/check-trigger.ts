import 'dotenv/config';
import { createPrismaClient, pool } from '../prisma/prisma-client';

const prisma = createPrismaClient();

async function checkTrigger() {
  try {
    // Check for the function
    const functions = await prisma.$queryRaw<Array<{ routine_name: string }>>`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_name = 'prevent_cost_json_update'
    `;
    
    console.log('Functions found:', functions);
    
    // Check for the trigger
    const triggers = await prisma.$queryRaw<Array<{ trigger_name: string, event_manipulation: string }>>`
      SELECT trigger_name, event_manipulation
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
        AND event_object_table = 'campaign_plans'
    `;
    
    console.log('Triggers found:', triggers);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

checkTrigger();

