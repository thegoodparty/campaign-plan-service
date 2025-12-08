/**
 * Database Integration Tests
 *
 * Tests Prisma client against a real PostgreSQL database to verify:
 * - Schema integrity
 * - CRUD operations
 * - Relationships (tasks, sections)
 * - Database constraints (triggers, indexes)
 */

import { createPrismaClient, pool } from '../../prisma/prisma-client.js'

const prisma = createPrismaClient()

describe('Database Integration', () => {
  afterAll(async () => {
    await prisma.$disconnect()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await pool.end()
  })

  describe('Campaign Plan CRUD', () => {
    it('should create a campaign plan', async () => {
      const plan = await prisma.campaignPlan.create({
        data: {
          campaignId: 1,
          version: 1,
          idempotencyKey: `test-create-${Date.now()}`,
          aiModel: 'gpt-4',
        },
      })

      expect(plan.id).toBeDefined()
      expect(plan.campaignId).toBe(1)
      expect(plan.version).toBe(1)
      expect(plan.aiModel).toBe('gpt-4')
      expect(plan.status).toBe('QUEUED')

      // Cleanup
      await prisma.campaignPlan.delete({ where: { id: plan.id } })
    })

    it('should create campaign plan with tasks', async () => {
      const plan = await prisma.campaignPlan.create({
        data: {
          campaignId: 2,
          version: 1,
          idempotencyKey: `test-tasks-${Date.now()}`,
          aiModel: 'gpt-4',
        },
      })

      const task = await prisma.campaignPlanTask.create({
        data: {
          planId: plan.id,
          type: 'DOOR_KNOCKING',
          title: 'Canvass neighborhood',
          description: 'Door-to-door canvassing',
          priority: 1,
        },
      })

      expect(task.id).toBeDefined()
      expect(task.planId).toBe(plan.id)
      expect(task.type).toBe('DOOR_KNOCKING')
      expect(task.status).toBe('NOT_STARTED')

      // Cleanup
      await prisma.campaignPlan.delete({ where: { id: plan.id } })
    })

    it('should create campaign plan with sections', async () => {
      const plan = await prisma.campaignPlan.create({
        data: {
          campaignId: 3,
          version: 1,
          idempotencyKey: `test-sections-${Date.now()}`,
          aiModel: 'gpt-4',
        },
      })

      const section = await prisma.campaignPlanSection.create({
        data: {
          planId: plan.id,
          key: 'introduction',
          title: 'Campaign Introduction',
          orderIndex: 1,
        },
      })

      expect(section.id).toBeDefined()
      expect(section.planId).toBe(plan.id)
      expect(section.key).toBe('introduction')

      // Cleanup
      await prisma.campaignPlan.delete({ where: { id: plan.id } })
    })

    it('should retrieve plan with tasks and sections', async () => {
      const plan = await prisma.campaignPlan.create({
        data: {
          campaignId: 4,
          version: 1,
          idempotencyKey: `test-relations-${Date.now()}`,
          aiModel: 'gpt-4',
        },
      })

      await prisma.campaignPlanTask.create({
        data: {
          planId: plan.id,
          type: 'SOCIAL_MEDIA',
          title: 'Post announcement',
          description: 'Social media post',
        },
      })

      await prisma.campaignPlanSection.create({
        data: {
          planId: plan.id,
          key: 'outreach',
          title: 'Voter Outreach',
          orderIndex: 1,
        },
      })

      const fullPlan = await prisma.campaignPlan.findUnique({
        where: { id: plan.id },
        include: {
          tasks: true,
          sections: true,
        },
      })

      expect(fullPlan).toBeDefined()
      expect(fullPlan?.tasks).toHaveLength(1)
      expect(fullPlan?.sections).toHaveLength(1)

      // Cleanup
      await prisma.campaignPlan.delete({ where: { id: plan.id } })
    })

    it('should update task status', async () => {
      const plan = await prisma.campaignPlan.create({
        data: {
          campaignId: 5,
          version: 1,
          idempotencyKey: `test-update-${Date.now()}`,
          aiModel: 'gpt-4',
        },
      })

      const task = await prisma.campaignPlanTask.create({
        data: {
          planId: plan.id,
          type: 'TEXT',
          title: 'Send SMS',
          description: 'Text message campaign',
        },
      })

      const updatedTask = await prisma.campaignPlanTask.update({
        where: { id: task.id },
        data: { status: 'COMPLETE' },
      })

      expect(updatedTask.status).toBe('COMPLETE')

      // Cleanup
      await prisma.campaignPlan.delete({ where: { id: plan.id } })
    })

    it('should cascade delete tasks and sections when plan is deleted', async () => {
      const plan = await prisma.campaignPlan.create({
        data: {
          campaignId: 6,
          version: 1,
          idempotencyKey: `test-cascade-${Date.now()}`,
          aiModel: 'gpt-4',
        },
      })

      const task = await prisma.campaignPlanTask.create({
        data: {
          planId: plan.id,
          type: 'EVENTS',
          title: 'Town hall',
          description: 'Community event',
        },
      })

      const section = await prisma.campaignPlanSection.create({
        data: {
          planId: plan.id,
          key: 'events',
          title: 'Events',
          orderIndex: 1,
        },
      })

      // Delete plan
      await prisma.campaignPlan.delete({ where: { id: plan.id } })

      // Verify cascade delete
      const deletedTask = await prisma.campaignPlanTask.findUnique({
        where: { id: task.id },
      })
      const deletedSection = await prisma.campaignPlanSection.findUnique({
        where: { id: section.id },
      })

      expect(deletedTask).toBeNull()
      expect(deletedSection).toBeNull()
    })
  })

  describe('Database Constraints', () => {
    it('should enforce cost immutability via trigger', async () => {
      const plan = await prisma.campaignPlan.create({
        data: {
          campaignId: 100,
          version: 1,
          idempotencyKey: `test-immutability-${Date.now()}`,
          aiModel: 'gpt-4',
          cost: {
            totalCost: 100,
            breakdown: { apiCalls: 50, processing: 50 },
          },
        },
      })

      // Verify cost was set
      expect(plan.cost).toBeDefined()

      // Attempt to update cost (should fail)
      await expect(
        prisma.campaignPlan.update({
          where: { id: plan.id },
          data: {
            cost: { totalCost: 200 },
          },
        }),
      ).rejects.toThrow('cost is immutable')

      // Verify other fields can still be updated
      const updated = await prisma.campaignPlan.update({
        where: { id: plan.id },
        data: { sourceReason: 'Updated reason' },
      })

      expect(updated.sourceReason).toBe('Updated reason')

      // Cleanup
      await prisma.campaignPlan.delete({ where: { id: plan.id } })
    })

    it('should enforce unique idempotency key', async () => {
      const idempotencyKey = `test-unique-${Date.now()}`

      const plan1 = await prisma.campaignPlan.create({
        data: {
          campaignId: 101,
          version: 1,
          idempotencyKey,
          aiModel: 'gpt-4',
        },
      })

      // Attempt to create duplicate (should fail)
      await expect(
        prisma.campaignPlan.create({
          data: {
            campaignId: 102,
            version: 1,
            idempotencyKey, // Same key
            aiModel: 'gpt-4',
          },
        }),
      ).rejects.toThrow()

      // Cleanup
      await prisma.campaignPlan.delete({ where: { id: plan1.id } })
    })
  })
})
