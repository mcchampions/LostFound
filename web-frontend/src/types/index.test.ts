import { describe, it, expect } from 'vitest';
import type {
  PageParams,
  PageResult,
  LostItemPageParams,
  FoundItemPageParams,
  CreateLostItemDTO,
  UpdateLostItemDTO,
  CreateFoundItemDTO,
  UpdateFoundItemDTO,
  UserInfo,
  LoginResponse,
  RegisterDTO,
  ApiError,
  FormRouteState,
  AdminUserPageParams,
  StatsData,
  TrendData,
  OperationLog,
  ClaimPageParams,
} from '../types';

describe('Types', () => {
  describe('分页相关类型', () => {
    it('PageParams 应该包含 page 和 size', () => {
      const params: PageParams = { page: 1, size: 20 };
      expect(params.page).toBe(1);
      expect(params.size).toBe(20);
    });

    it('PageResult 应该包含 records 和 total', () => {
      const result: PageResult<string> = {
        records: ['a', 'b'],
        total: 2,
        current: 1,
        size: 20,
      };
      expect(result.records).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('LostItemPageParams 应该支持可选筛选参数', () => {
      const params: LostItemPageParams = {
        page: 1,
        size: 12,
        keyword: '手机',
        categoryId: 5,
        status: 'LOST',
      };
      expect(params.keyword).toBe('手机');
      expect(params.categoryId).toBe(5);
    });

    it('FoundItemPageParams 应该支持可选筛选参数', () => {
      const params: FoundItemPageParams = {
        page: 1,
        size: 12,
        status: 'CLAIMED',
      };
      expect(params.status).toBe('CLAIMED');
    });
  });

  describe('物品DTO类型', () => {
    it('CreateLostItemDTO 应该包含必填字段', () => {
      const dto: CreateLostItemDTO = {
        title: '丢失的手机',
        description: '黑色iPhone',
        categoryId: 1,
        location: '图书馆',
        lostTime: '2026-08-04T10:00',
        imageUrls: [],
      };
      expect(dto.title).toBe('丢失的手机');
    });

    it('UpdateLostItemDTO 应该支持部分更新', () => {
      const dto: UpdateLostItemDTO = {
        title: '更新后的标题',
      };
      expect(dto.title).toBe('更新后的标题');
      expect(dto.description).toBeUndefined();
    });

    it('CreateFoundItemDTO 应该包含必填字段', () => {
      const dto: CreateFoundItemDTO = {
        title: '捡到的钥匙',
        description: '一串钥匙',
        categoryId: 2,
        location: '食堂',
        foundTime: '2026-08-04T12:00',
        imageUrls: [],
      };
      expect(dto.title).toBe('捡到的钥匙');
    });

    it('UpdateFoundItemDTO 应该支持部分更新', () => {
      const dto: UpdateFoundItemDTO = {};
      expect(dto.title).toBeUndefined();
    });
  });

  describe('用户相关类型', () => {
    it('UserInfo 应该包含用户基本信息', () => {
      const user: UserInfo = {
        id: 1,
        username: 'testuser',
        role: 'USER',
        status: 'ACTIVE',
        createdAt: '2026-08-04T10:00:00',
      };
      expect(user.id).toBe(1);
      expect(user.role).toBe('USER');
    });

    it('LoginResponse 应该包含 token 和 user', () => {
      const response: LoginResponse = {
        token: 'jwt-token',
        user: {
          id: 1,
          username: 'testuser',
          role: 'USER',
          status: 'ACTIVE',
          createdAt: '2026-08-04',
        },
      };
      expect(response.token).toBe('jwt-token');
    });

    it('RegisterDTO 应该包含注册字段', () => {
      const dto: RegisterDTO = {
        username: 'newuser',
        password: 'password123',
        realName: '新用户',
        role: 'USER',
      };
      expect(dto.username).toBe('newuser');
    });
  });

  describe('API错误类型', () => {
    it('ApiError 应该支持 response 结构', () => {
      const error: ApiError = {
        response: {
          status: 400,
          data: {
            code: 400,
            message: '参数错误',
          },
        },
      };
      expect(error.response?.status).toBe(400);
      expect(error.response?.data?.message).toBe('参数错误');
    });

    it('ApiError 应该支持无 response 的情况', () => {
      const error: ApiError = {
        message: 'Network Error',
      };
      expect(error.response).toBeUndefined();
      expect(error.message).toBe('Network Error');
    });
  });

  describe('表单路由状态', () => {
    it('FormRouteState 应该支持 item 可选', () => {
      const state: FormRouteState = {};
      expect(state.item).toBeUndefined();
    });
  });

  describe('管理员相关类型', () => {
    it('AdminUserPageParams 应该包含 keyword 可选', () => {
      const params: AdminUserPageParams = {
        page: 1,
        size: 10,
        keyword: 'admin',
      };
      expect(params.keyword).toBe('admin');
    });

    it('StatsData 应该支持动态键', () => {
      const stats: StatsData = {
        totalUsers: 100,
        totalLostItems: 50,
        lostCount: 50,
      };
      expect(stats.totalUsers).toBe(100);
      expect(stats['lostCount']).toBe(50);
    });

    it('TrendData 应该包含日期和计数', () => {
      const trend: TrendData = {
        date: '2026-08-04',
        lostCount: 5,
        foundCount: 3,
        claimCount: 2,
      };
      expect(trend.date).toBe('2026-08-04');
    });

    it('OperationLog 应该包含操作日志字段', () => {
      const log: OperationLog = {
        id: 1,
        userId: 1,
        action: 'LOGIN',
        targetType: 'USER',
        createdAt: '2026-08-04',
      };
      expect(log.action).toBe('LOGIN');
    });
  });

  describe('认领相关类型', () => {
    it('ClaimPageParams 应该支持 status 筛选', () => {
      const params: ClaimPageParams = {
        page: 1,
        size: 20,
        status: 'PENDING',
      };
      expect(params.status).toBe('PENDING');
    });
  });
});
