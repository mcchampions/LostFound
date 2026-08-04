import { Chip } from '@mui/material';
import ItemList from '../components/ItemList';
import type { ItemListConfig } from '../components/ItemList';
import { getLostItems } from '../api/lostItems';
import type { LostItemVO } from '../api/lostItems';

const lostConfig: ItemListConfig<LostItemVO> = {
  type: 'lost',
  title: '失物信息',
  createPath: '/lost-items/create',
  detailPath: '/lost-items',
  fetchItems: getLostItems,
  getStatusChip: (status: string) => {
    if (status === 'LOST') return <Chip label="未找到" size="small" color="error" />;
    if (status === 'FOUND') return <Chip label="已找到" size="small" color="success" />;
    return <Chip label={status} size="small" />;
  },
  getTimeLabel: () => '时间',
  getTimeValue: (item: LostItemVO) => item.lostTime,
  getTimeEndValue: (item: LostItemVO) => item.lostTimeEnd,
  statusOptions: [
    { value: 'LOST', label: '未找到' },
    { value: 'FOUND', label: '已找到' },
  ],
  emptyText: '暂无失物信息',
  emptyActionText: '发布第一条失物',
  createButtonText: '发布失物',
};

export default function LostItemList() {
  return <ItemList config={lostConfig} />;
}
