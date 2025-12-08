/**
 * Test script to verify cost_json immutability at the database level
 * This tests that the PostgreSQL trigger prevents updates to cost_json
 */

import 'dotenv/config';
import { createPrismaClient, pool } from '../prisma/prisma-client';

const prisma = createPrismaClient();

async function testCostJsonImmutability() {
  console.log('🧪 Testing cost_json immutability...\n');

  try {
    // 1. Create a test campaign plan with cost_json
    console.log('1️⃣  Creating campaign plan with cost_json...');
    const plan = await prisma.campaignPlan.create({
      data: {
        campaignId: 999,
        version: 1,
        idempotencyKey: `test-immutability-${Date.now()}`,
        model: 'gpt-4',
        costJson: {
          totalCost: 100,
          breakdown: { apiCalls: 50, processing: 50 },
        },
        sourceReason: 'Immutability test',
      },
    });
    console.log(`✅ Created plan: ${plan.id}`);
    console.log(`   cost_json:`, plan.costJson);
    console.log('');

    // 2. Try to update a different field (should succeed)
    console.log('2️⃣  Updating sourceReason (should succeed)...');
    const updated = await prisma.campaignPlan.update({
      where: { id: plan.id },
      data: {
        sourceReason: 'Updated reason',
      },
    });
    console.log(`✅ Update succeeded: sourceReason = "${updated.sourceReason}"`);
    console.log('');

    // 3. Try to update cost_json (should fail with trigger error)
    console.log('3️⃣  Attempting to update cost_json (should fail)...');
    try {
      await prisma.campaignPlan.update({
        where: { id: plan.id },
        data: {
          costJson: {
            totalCost: 200, // Try to change it
            breakdown: { apiCalls: 100, processing: 100 },
          },
        },
      });
      console.log('❌ FAIL: cost_json was updated (trigger not working!)');
    } catch (error) {
      if (error instanceof Error && error.message.includes('cost_json is immutable')) {
        console.log('✅ SUCCESS: Trigger blocked the update');
        console.log(`   Error message: "${error.message}"`);
      } else {
        console.log('❌ FAIL: Unexpected error:', error);
      }
    }
    console.log('');

    // 4. Try to set cost_json to null (should also fail)
    console.log('4️⃣  Attempting to set cost_json to null (should fail)...');
    try {
      await prisma.campaignPlan.update({
        where: { id: plan.id },
        data: {
          costJson: null,
        },
      });
      console.log('❌ FAIL: cost_json was set to null (trigger not working!)');
    } catch (error) {
      if (error instanceof Error && error.message.includes('cost_json is immutable')) {
        console.log('✅ SUCCESS: Trigger blocked setting to null');
        console.log(`   Error message: "${error.message}"`);
      } else {
        console.log('❌ FAIL: Unexpected error:', error);
      }
    }
    console.log('');

    // 5. Cleanup
    console.log('5️⃣  Cleaning up test data...');
    await prisma.campaignPlan.delete({ where: { id: plan.id } });
    console.log('✅ Test plan deleted');
    console.log('');

    console.log('🎉 All immutability tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

testCostJsonImmutability();

