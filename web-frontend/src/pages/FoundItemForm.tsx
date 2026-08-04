import ItemForm from '../components/ItemForm';
import type { ItemFormConfig } from '../components/ItemForm';
import { createFoundItem, updateFoundItem, getFoundItem } from '../api/foundItems';
import type { FoundItemVO } from '../api/foundItems';
import type { CreateFoundItemDTO } from '../types';

const foundFormConfig: ItemFormConfig<FoundItemVO, CreateFoundItemDTO> = {
  type: 'found',
  title: { create: '发布招领信息', edit: '编辑招领信息' },
  timeLabel: '发现时间',
  locationLabel: '发现地点',
  fetchItem: getFoundItem,
  createItem: createFoundItem,
  updateItem: updateFoundItem,
  toFormValues: item => ({
    title: item.title,
    categoryId: item.categoryId,
    description: item.description,
    location: item.location,
    timeStart: item.foundTime.substring(0, 16),
    timeEnd: item.foundTimeEnd?.substring(0, 16) ?? '',
    imageUrls: item.imageUrls,
    coverImage: item.coverImage ?? '',
  }),
  toPayload: values => ({
    title: values.title,
    categoryId: values.categoryId as number,
    description: values.description,
    location: values.location,
    foundTime: values.timeStart,
    foundTimeEnd: values.timeEnd || undefined,
    imageUrls: values.imageUrls,
    coverImage: values.coverImage || undefined,
  }),
  listPath: '/found-items',
};

export default function FoundItemForm() {
  return <ItemForm config={foundFormConfig} />;
}
