import { Chip } from '@mui/material';
import ItemList from '../components/ItemList';
import type { ItemListConfig } from '../components/ItemList';
import { getFoundItems } from '../api/foundItems';
import type { FoundItemVO } from '../api/foundItems';
import { useTranslation } from 'react-i18next';

export default function FoundItemList() {
  const { t } = useTranslation();
  const foundConfig: ItemListConfig<FoundItemVO> = {
    type: 'found',
    title: t('foundItem.listTitle'),
    createPath: '/found-items/create',
    detailPath: '/found-items',
    fetchItems: getFoundItems,
    getStatusChip: (status: string) => {
      if (status === 'UNCLAIMED') return <Chip label={t('foundItem.activeStatusLabel')} size="small" color="warning" />;
      if (status === 'CLAIMED') return <Chip label={t('foundItem.resolvedStatusLabel')} size="small" color="success" />;
      return <Chip label={status} size="small" />;
    },
    getTimeLabel: () => t('foundItem.timeLabelShort'),
    getTimeValue: (item: FoundItemVO) => item.foundTime,
    getTimeEndValue: (item: FoundItemVO) => item.foundTimeEnd,
    statusOptions: [
      { value: 'UNCLAIMED', label: t('foundItem.activeStatusLabel') },
      { value: 'CLAIMED', label: t('foundItem.resolvedStatusLabel') },
    ],
    emptyText: t('foundItem.emptyText'),
    emptyActionText: t('foundItem.emptyActionText'),
    createButtonText: t('foundItem.createButtonText'),
  };
  return <ItemList config={foundConfig} />;
}
