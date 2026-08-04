import { Chip } from '@mui/material';
import ItemList from '../components/ItemList';
import type { ItemListConfig } from '../components/ItemList';
import { getFoundItems } from '../api/foundItems';
import type { FoundItemVO } from '../api/foundItems';

const foundConfig: ItemListConfig<FoundItemVO> = {
  type: 'found',
  title: '招领信息',
  createPath: '/found-items/create',
  detailPath: '/found-items',
  fetchItems: getFoundItems,
  getStatusChip: (status: string) => {
    if (status === 'UNCLAIMED') return <Chip label="待认领" size="small" color="warning" />;
    if (status === 'CLAIMED') return <Chip label="已认领" size="small" color="success" />;
    return <Chip label={status} size="small" />;
  },
  getTimeLabel: () => '时间',
  getTimeValue: (item: FoundItemVO) => item.foundTime,
  getTimeEndValue: (item: FoundItemVO) => item.foundTimeEnd,
  statusOptions: [
    { value: 'UNCLAIMED', label: '待认领' },
    { value: 'CLAIMED', label: '已认领' },
  ],
  emptyText: '暂无招领信息',
  emptyActionText: '发布第一条招领',
  createButtonText: '发布招领',
};

export default function FoundItemList() {
  return <ItemList config={foundConfig} />;
}
