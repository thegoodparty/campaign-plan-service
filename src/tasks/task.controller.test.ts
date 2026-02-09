import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { TaskController } from './task.controller'
import { TaskService } from './task.service'

const mockTask = {
  id: '01961234-aaaa-7bbb-cccc-dddddddddddd',
  planId: '01961234-5678-7abc-def0-123456789abc',
  type: 'DOOR_KNOCKING',
  title: 'Knock on doors in District 5',
  description: 'Canvas the neighborhood',
  dueDate: null,
  weekIndex: 1,
  status: 'NOT_STARTED',
  actionUrl: null,
  priority: 1,
  tags: [],
  metadata: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
}

describe('TaskController', () => {
  let controller: TaskController
  let taskService: TaskService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        {
          provide: TaskService,
          useValue: {
            findAllByPlanId: vi.fn(),
            findOne: vi.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<TaskController>(TaskController)
    taskService = module.get<TaskService>(TaskService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('findAll', () => {
    it('should return an array of tasks', async () => {
      vi.spyOn(taskService, 'findAllByPlanId').mockResolvedValue([
        mockTask,
      ] as never)

      const result = await controller.findAll(mockTask.planId)
      expect(result).toEqual([mockTask])
      expect(taskService.findAllByPlanId).toHaveBeenCalledWith(mockTask.planId)
    })

    it('should return an empty array when no tasks exist', async () => {
      vi.spyOn(taskService, 'findAllByPlanId').mockResolvedValue([] as never)

      const result = await controller.findAll(mockTask.planId)
      expect(result).toEqual([])
    })

    it('should propagate NotFoundException from service', async () => {
      vi.spyOn(taskService, 'findAllByPlanId').mockRejectedValue(
        new NotFoundException(),
      )

      await expect(controller.findAll('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('findOne', () => {
    it('should return a single task', async () => {
      vi.spyOn(taskService, 'findOne').mockResolvedValue(mockTask as never)

      const result = await controller.findOne(mockTask.planId, mockTask.id)
      expect(result).toEqual(mockTask)
      expect(taskService.findOne).toHaveBeenCalledWith(
        mockTask.planId,
        mockTask.id,
      )
    })

    it('should propagate NotFoundException from service', async () => {
      vi.spyOn(taskService, 'findOne').mockRejectedValue(
        new NotFoundException(),
      )

      await expect(
        controller.findOne(mockTask.planId, 'nonexistent-task'),
      ).rejects.toThrow(NotFoundException)
    })
  })
})
