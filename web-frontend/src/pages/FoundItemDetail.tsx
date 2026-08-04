import ItemDetail from '../components/ItemDetail';
import type { ItemDetailConfig } from '../components/ItemDetail';
import { deleteFoundItem, getFoundItem } from '../api/foundItems';
import type { FoundItemVO } from '../api/foundItems';

const foundDetailConfig: ItemDetailConfig<FoundItemVO> = {
  type: 'found',
  itemType: 'FOUND',
  infoName: '招领信息',
  listPath: '/found-items',
  editPath: '/found-items',
  fetchItem: getFoundItem,
  deleteItem: deleteFoundItem,
  getTimeStart: item => item.foundTime,
  getTimeEnd: item => item.foundTimeEnd,
  locationLabel: '发现地点',
  timeLabel: '发现时间',
  activeStatus: 'UNCLAIMED',
  resolvedStatus: 'CLAIMED',
  activeStatusLabel: '待认领',
  resolvedStatusLabel: '已认领',
  activeStatusColor: 'warning',
  ownerResolveButton: '标记已归还',
  chatButton: '给拾主发消息',
  claimButton: '我要认领',
  claimDialogTitle: '认领物品',
  claimFieldLabel: '认领说明',
  claimPlaceholder: '请描述物品特征以便确认身份...',
  claimRequiredMessage: '请填写认领说明',
  claimSubmitButton: '提交认领',
  claimSuccessMessage: '认领申请已提交！',
  resolveDialogTitle: '标记已归还',
  resolveQuestion: '归还给了谁？',
  resolveSelfLabel: '失主本人已认领',
  resolveUserLabel: '站内用户认领',
  resolveOtherLabel: '其他人私下归还',
  resolveSubmitButton: '标记已归还',
  resolvedHeading: '归还情况',
  resolvedSelfText: '失主本人已认领',
  resolvedUserPrefix: '已归还给站内用户',
  resolvedUserSuffix: '',
  resolvedOtherText: '已通过其他渠道归还',
  resolvedFallbackText: '已确认归还',
};

export default function FoundItemDetail() {
  return <ItemDetail config={foundDetailConfig} />;
}
