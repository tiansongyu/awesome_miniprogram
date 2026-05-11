import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    adminLogin: jest.fn(),
    wechatLogin: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('POST /auth/admin/login', () => {
    it('should return tokens on successful admin login', async () => {
      const dto = { phone: '13800138000', password: 'password123' };
      const mockTokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };
      mockAuthService.adminLogin.mockResolvedValue(mockTokens);

      const result = await controller.adminLogin(dto);

      expect(result).toEqual(mockTokens);
      expect(mockAuthService.adminLogin).toHaveBeenCalledWith(dto);
    });

    it('should propagate error when login fails', async () => {
      const dto = { phone: '13800138000', password: 'wrong' };
      mockAuthService.adminLogin.mockRejectedValue(new Error('Unauthorized'));

      await expect(controller.adminLogin(dto)).rejects.toThrow('Unauthorized');
    });
  });

  describe('POST /auth/wechat/login', () => {
    it('should return tokens on successful wechat login', async () => {
      const dto = { code: 'wechat-code' };
      const mockTokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };
      mockAuthService.wechatLogin.mockResolvedValue(mockTokens);

      const result = await controller.wechatLogin(dto);

      expect(result).toEqual(mockTokens);
      expect(mockAuthService.wechatLogin).toHaveBeenCalledWith(dto);
    });

    it('should pass bindCode when provided', async () => {
      const dto = { code: 'wechat-code', bindCode: 'AGENT123' };
      const mockTokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };
      mockAuthService.wechatLogin.mockResolvedValue(mockTokens);

      const result = await controller.wechatLogin(dto);

      expect(result).toEqual(mockTokens);
      expect(mockAuthService.wechatLogin).toHaveBeenCalledWith(dto);
    });
  });
});
