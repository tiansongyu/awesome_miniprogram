import { Test, TestingModule } from '@nestjs/testing';
import { AddressService } from './address.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('AddressService', () => {
  let service: AddressService;
  let prisma: PrismaService;

  const mockPrisma = {
    address: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const userId = 'user-1';

  const mockAddress = {
    id: 'addr-1',
    userId,
    name: '张三',
    phone: '13800000000',
    province: '广东省',
    city: '深圳市',
    district: '南山区',
    detail: '科技园路1号',
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AddressService>(AddressService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all addresses for a user ordered by default and createdAt', async () => {
      const mockAddresses = [
        { ...mockAddress, isDefault: true },
        { ...mockAddress, id: 'addr-2', isDefault: false },
      ];
      mockPrisma.address.findMany.mockResolvedValue(mockAddresses);

      const result = await service.findAll(userId);

      expect(result).toEqual(mockAddresses);
      expect(mockPrisma.address.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });

    it('should return empty array when user has no addresses', async () => {
      mockPrisma.address.findMany.mockResolvedValue([]);

      const result = await service.findAll(userId);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    const createDto = {
      name: '张三',
      phone: '13800000000',
      province: '广东省',
      city: '深圳市',
      district: '南山区',
      detail: '科技园路1号',
    };

    it('should create an address', async () => {
      mockPrisma.address.create.mockResolvedValue({ ...mockAddress });

      const result = await service.create(userId, createDto);

      expect(result).toEqual(mockAddress);
      expect(mockPrisma.address.create).toHaveBeenCalledWith({
        data: { ...createDto, userId },
      });
    });

    it('should unset other defaults when creating with isDefault=true', async () => {
      const dtoWithDefault = { ...createDto, isDefault: true };
      const createdAddress = { ...mockAddress, isDefault: true };
      mockPrisma.address.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.address.create.mockResolvedValue(createdAddress);

      const result = await service.create(userId, dtoWithDefault);

      expect(mockPrisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
      expect(mockPrisma.address.create).toHaveBeenCalledWith({
        data: { ...dtoWithDefault, userId },
      });
      expect(result).toEqual(createdAddress);
    });

    it('should not unset other defaults when creating without isDefault', async () => {
      mockPrisma.address.create.mockResolvedValue(mockAddress);

      await service.create(userId, createDto);

      expect(mockPrisma.address.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto = { name: '李四', phone: '13900000000' };

    it('should update an address', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);
      const updatedAddress = { ...mockAddress, ...updateDto };
      mockPrisma.address.update.mockResolvedValue(updatedAddress);

      const result = await service.update('addr-1', userId, updateDto);

      expect(result).toEqual(updatedAddress);
      expect(mockPrisma.address.update).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
        data: updateDto,
      });
    });

    it('should throw NotFoundException when address does not exist', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(null);

      await expect(service.update('addr-999', userId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when address belongs to another user', async () => {
      mockPrisma.address.findUnique.mockResolvedValue({
        ...mockAddress,
        userId: 'other-user',
      });

      await expect(service.update('addr-1', userId, updateDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should unset other defaults when updating with isDefault=true', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);
      mockPrisma.address.updateMany.mockResolvedValue({ count: 1 });
      const updatedAddress = { ...mockAddress, isDefault: true };
      mockPrisma.address.update.mockResolvedValue(updatedAddress);

      const result = await service.update('addr-1', userId, { isDefault: true });

      expect(mockPrisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
      expect(result.isDefault).toBe(true);
    });
  });

  describe('remove', () => {
    it('should delete an address and return success', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);
      mockPrisma.address.delete.mockResolvedValue(mockAddress);

      const result = await service.remove('addr-1', userId);

      expect(result).toEqual({ success: true });
      expect(mockPrisma.address.delete).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
      });
    });

    it('should throw NotFoundException when address does not exist', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(null);

      await expect(service.remove('addr-999', userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when address belongs to another user', async () => {
      mockPrisma.address.findUnique.mockResolvedValue({
        ...mockAddress,
        userId: 'other-user',
      });

      await expect(service.remove('addr-1', userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('setDefault', () => {
    it('should set an address as default and unset others', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);
      mockPrisma.address.updateMany.mockResolvedValue({ count: 1 });
      const defaultAddress = { ...mockAddress, isDefault: true };
      mockPrisma.address.update.mockResolvedValue(defaultAddress);

      const result = await service.setDefault('addr-1', userId);

      expect(mockPrisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
      expect(mockPrisma.address.update).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
        data: { isDefault: true },
      });
      expect(result.isDefault).toBe(true);
    });

    it('should throw NotFoundException when address does not exist', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(null);

      await expect(service.setDefault('addr-999', userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when address belongs to another user', async () => {
      mockPrisma.address.findUnique.mockResolvedValue({
        ...mockAddress,
        userId: 'other-user',
      });

      await expect(service.setDefault('addr-1', userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
