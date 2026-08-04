import type { LostItemVO } from '../api/lostItems';
import type { FoundItemVO } from '../api/foundItems';

// ==================== 分页相关 ====================

export interface PageParams {
  page: number;
  size: number;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}

export interface LostItemPageParams extends PageParams {
  keyword?: string;
  categoryId?: number;
  status?: string;
}

export interface FoundItemPageParams extends PageParams {
  keyword?: string;
  categoryId?: number;
  status?: string;
}

// ==================== 物品DTO ====================

export interface CreateLostItemDTO {
  title: string;
  description: string;
  categoryId: number;
  location: string;
  lostTime: string;
  lostTimeEnd?: string;
  imageUrls: string[];
  coverImage?: string;
}

export type UpdateLostItemDTO = Partial<CreateLostItemDTO>;

export interface CreateFoundItemDTO {
  title: string;
  description: string;
  categoryId: number;
  location: string;
  foundTime: string;
  foundTimeEnd?: string;
  imageUrls: string[];
  coverImage?: string;
}

export type UpdateFoundItemDTO = Partial<CreateFoundItemDTO>;

// ==================== 用户相关 ====================

export interface UserInfo {
  id: number;
  username: string;
  realName?: string;
  role: string;
  status: string;
  email?: string;
  phone?: string;
  avatar?: string;
  emailVerified?: number;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export interface RegisterDTO {
  username: string;
  password: string;
  realName: string;
  role: string;
  email?: string;
  phone?: string;
}

// ==================== API错误 ====================

export interface ApiError {
  response?: {
    status: number;
    data?: {
      code?: number;
      message?: string;
      data?: unknown;
    };
  };
  message?: string;
}

// ==================== 表单路由状态 ====================

export interface FormRouteState {
  item?: LostItemVO | FoundItemVO;
}

// ==================== 管理员相关 ====================

export interface AdminUserPageParams extends PageParams {
  keyword?: string;
}

export interface StatsData {
  totalUsers: number;
  totalLostItems: number;
  totalFoundItems: number;
  totalClaims: number;
  todayLostItems: number;
  todayFoundItems: number;
  todayClaims: number;
  resolvedRate: number;
  [key: string]: number | string;
}

export interface TrendData {
  date: string;
  lostCount: number;
  foundCount: number;
  claimCount: number;
}

export interface OperationLog {
  id: number;
  userId: number;
  action: string;
  targetType: string;
  targetId?: number;
  detail?: string;
  createdAt: string;
}

// ==================== 聊天相关 ====================

export type ChatMessagePage = PageResult<import('../api/chat').MessageVO>;

// ==================== 认领相关 ====================

export interface ClaimPageParams extends PageParams {
  status?: string;
}
