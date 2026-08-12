import ItemForm from '../components/ItemForm';
import type { ItemFormConfig } from '../components/ItemForm';
import { createLostItem, updateLostItem, getLostItem } from '../api/lostItems';
import type { LostItemVO } from '../api/lostItems';
import type { CreateLostItemDTO } from '../types';
import { useTranslation } from 'react-i18next';

export default function LostItemForm() {
  const { t } = useTranslation();
  const lostFormConfig: ItemFormConfig<LostItemVO, CreateLostItemDTO> = {
    type: 'lost',
    title: { create: t('lostItem.formTitleCreate'), edit: t('lostItem.formTitleEdit') },
    timeLabel: t('lostItem.timeLabel'),
    locationLabel: t('lostItem.locationLabel'),
    fetchItem: getLostItem,
    createItem: createLostItem,
    updateItem: updateLostItem,
    toFormValues: item => ({
      title: item.title,
      categoryId: item.categoryId,
      description: item.description,
      location: item.location,
      timeStart: item.lostTime.substring(0, 16),
      timeEnd: item.lostTimeEnd?.substring(0, 16) ?? '',
      imageUrls: item.imageUrls,
      coverImage: item.coverImage ?? '',
    }),
    toPayload: values => ({
      title: values.title,
      categoryId: values.categoryId as number,
      description: values.description,
      location: values.location,
      lostTime: values.timeStart,
      lostTimeEnd: values.timeEnd || undefined,
      imageUrls: values.imageUrls,
      coverImage: values.coverImage || undefined,
    }),
    listPath: '/lost-items',
  };
  return <ItemForm config={lostFormConfig} />;
}
