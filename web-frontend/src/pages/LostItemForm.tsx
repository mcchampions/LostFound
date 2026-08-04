import ItemForm from '../components/ItemForm';
import type { ItemFormConfig } from '../components/ItemForm';
import { createLostItem, updateLostItem, getLostItem } from '../api/lostItems';
import type { LostItemVO } from '../api/lostItems';
import type { CreateLostItemDTO } from '../types';

const lostFormConfig: ItemFormConfig<LostItemVO, CreateLostItemDTO> = {
  type: 'lost',
  title: { create: '发布失物信息', edit: '编辑失物信息' },
  timeLabel: '丢失时间',
  locationLabel: '丢失地点',
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

export default function LostItemForm() {
  return <ItemForm config={lostFormConfig} />;
}
