import { Chip } from '@mui/material';
import ItemList from '../components/ItemList';
import type { ItemListConfig } from '../components/ItemList';
import { getLostItems } from '../api/lostItems';
import type { LostItemVO } from '../api/lostItems';
import { useTranslation } from 'react-i18next';

export default function LostItemList() {
  const { t } = useTranslation();
  const lostConfig: ItemListConfig<LostItemVO> = {
    type: 'lost',
    title: t('lostItem.listTitle'),
    createPath: '/lost-items/create',
    detailPath: '/lost-items',
    fetchItems: getLostItems,
    getStatusChip: (status: string) => {
      if (status === 'LOST') return <Chip label={t('lostItem.activeStatusLabel')} size="small" color="error" />;
      if (status === 'FOUND') return <Chip label={t('lostItem.resolvedStatusLabel')} size="small" color="success" />;
      return <Chip label={status} size="small" />;
    },
    getTimeLabel: () => t('lostItem.timeLabelShort'),
    getTimeValue: (item: LostItemVO) => item.lostTime,
    getTimeEndValue: (item: LostItemVO) => item.lostTimeEnd,
    statusOptions: [
      { value: 'LOST', label: t('lostItem.activeStatusLabel') },
      { value: 'FOUND', label: t('lostItem.resolvedStatusLabel') },
    ],
    emptyText: t('lostItem.emptyText'),
    emptyActionText: t('lostItem.emptyActionText'),
    createButtonText: t('lostItem.createButtonText'),
  };
  return <ItemList config={lostConfig} />;
}
