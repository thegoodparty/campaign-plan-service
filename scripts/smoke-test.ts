import 'dotenv/config'
import { createPrismaClient, pool } from '../prisma/prisma-client'

const prisma = createPrismaClient()

async function main() {
  console.log('🔍 Starting Prisma smoke test...\n')

  try {
    // Test 1: Create a campaign plan
    console.log('1️⃣ Creating a campaign plan...')
    const plan = await prisma.campaignPlan.create({
      data: {
        campaignId: 1,
        version: 1,
        idempotencyKey: `test-${Date.now()}`,
        model: 'gpt-4',
        status: 'queued',
      },
    })
    console.log('✅ Campaign plan created:', plan.id)

    // Test 2: Create campaign plan tasks
    console.log('\n2️⃣ Creating campaign plan tasks...')
    const task1 = await prisma.campaignPlanTask.create({
      data: {
        planId: plan.id,
        type: 'doorKnocking',
        title: 'Canvass neighborhood',
        description: 'Door-to-door canvassing in district 5',
        dueDate: new Date('2025-01-15'),
        weekIndex: 1,
        priority: 1,
        tags: ['canvassing', 'outreach'],
      },
    })
    console.log('✅ Task 1 created:', task1.id)

    const task2 = await prisma.campaignPlanTask.create({
      data: {
        planId: plan.id,
        type: 'socialMedia',
        title: 'Post campaign announcement',
        description: 'Announce campaign kickoff on social media',
        dueDate: new Date('2025-01-10'),
        weekIndex: 1,
        priority: 2,
        tags: ['social', 'announcement'],
      },
    })
    console.log('✅ Task 2 created:', task2.id)

    // Test 3: Create campaign plan sections
    console.log('\n3️⃣ Creating campaign plan sections...')
    const section1 = await prisma.campaignPlanSection.create({
      data: {
        planId: plan.id,
        key: 'introduction',
        title: 'Campaign Introduction',
        summary: 'Overview of the campaign strategy and goals',
        orderIndex: 1,
      },
    })
    console.log('✅ Section 1 created:', section1.id)

    const section2 = await prisma.campaignPlanSection.create({
      data: {
        planId: plan.id,
        key: 'outreach',
        title: 'Voter Outreach',
        summary: 'Strategy for reaching voters through various channels',
        orderIndex: 2,
      },
    })
    console.log('✅ Section 2 created:', section2.id)

    // Test 4: Read plan with tasks and sections
    console.log('\n4️⃣ Reading campaign plan with tasks and sections...')
    const fullPlan = await prisma.campaignPlan.findUnique({
      where: { id: plan.id },
      include: {
        tasks: true,
        sections: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    })
    console.log('✅ Plan retrieved with:')
    console.log(`   - ${fullPlan?.tasks.length} tasks`)
    console.log(`   - ${fullPlan?.sections.length} sections`)

    // Test 5: Update task status
    console.log('\n5️⃣ Updating task status...')
    await prisma.campaignPlanTask.update({
      where: { id: task1.id },
      data: { status: 'complete' },
    })
    console.log('✅ Task status updated')

    // Test 6: Clean up test data
    console.log('\n6️⃣ Cleaning up test data...')
    await prisma.campaignPlan.delete({
      where: { id: plan.id },
    })
    console.log('✅ Test data cleaned up (cascade delete tasks & sections)')

    console.log('\n✨ All smoke tests passed! Prisma integration is working correctly.\n')
  } catch (error) {
    console.error('\n❌ Smoke test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()

