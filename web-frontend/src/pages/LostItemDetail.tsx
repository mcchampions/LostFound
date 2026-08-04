import ItemDetail from '../components/ItemDetail';
import type { ItemDetailConfig } from '../components/ItemDetail';
import { deleteLostItem, getLostItem } from '../api/lostItems';
import type { LostItemVO } from '../api/lostItems';

const lostDetailConfig: ItemDetailConfig<LostItemVO> = {
  type: 'lost',
  itemType: 'LOST',
  infoName: '失物信息',
  listPath: '/lost-items',
  editPath: '/lost-items',
  fetchItem: getLostItem,
  deleteItem: deleteLostItem,
  getTimeStart: item => item.lostTime,
  getTimeEnd: item => item.lostTimeEnd,
  locationLabel: '丢失地点',
  timeLabel: '丢失时间',
  activeStatus: 'LOST',
  resolvedStatus: 'FOUND',
  activeStatusLabel: '未找到',
  resolvedStatusLabel: '已找到',
  activeStatusColor: 'error',
  ownerResolveButton: '标记已找到',
  chatButton: '给失主发消息',
  claimButton: '我找到了',
  claimDialogTitle: '我找到了这个物品',
  claimFieldLabel: '找到说明',
  claimPlaceholder: '请描述您在哪里找到的...',
  claimRequiredMessage: '请描述您在哪里找到的',
  claimSubmitButton: '提交',
  claimSuccessMessage: '提交成功，物主将会收到通知！',
  resolveDialogTitle: '标记已找到',
  resolveQuestion: '是谁找到的？',
  resolveSelfLabel: '我自己找到的',
  resolveUserLabel: '站内用户找到',
  resolveOtherLabel: '其他人私下解决',
  resolveSubmitButton: '标记已找到',
  resolvedHeading: '解决情况',
  resolvedSelfText: '发布者自行找回',
  resolvedUserPrefix: '由站内用户',
  resolvedUserSuffix: ' 找到',
  resolvedOtherText: '通过其他渠道找回',
  resolvedFallbackText: '已确认找回',
};

export default function LostItemDetail() {
  return <ItemDetail config={lostDetailConfig} />;
}
