import ItemDetail from '../components/ItemDetail';
import type { ItemDetailConfig } from '../components/ItemDetail';
import { deleteLostItem, getLostItem } from '../api/lostItems';
import type { LostItemVO } from '../api/lostItems';
import { useTranslation } from 'react-i18next';

export default function LostItemDetail() {
  const { t } = useTranslation();
  const lostDetailConfig: ItemDetailConfig<LostItemVO> = {
    type: 'lost',
    itemType: 'LOST',
    infoName: t('lostItem.infoName'),
    listPath: '/lost-items',
    editPath: '/lost-items',
    fetchItem: getLostItem,
    deleteItem: deleteLostItem,
    getTimeStart: item => item.lostTime,
    getTimeEnd: item => item.lostTimeEnd,
    locationLabel: t('lostItem.locationLabel'),
    timeLabel: t('lostItem.timeLabel'),
    activeStatus: 'LOST',
    resolvedStatus: 'FOUND',
    activeStatusLabel: t('lostItem.activeStatusLabel'),
    resolvedStatusLabel: t('lostItem.resolvedStatusLabel'),
    activeStatusColor: 'error',
    ownerResolveButton: t('lostItem.ownerResolveButton'),
    chatButton: t('lostItem.chatButton'),
    claimButton: t('lostItem.claimButton'),
    claimDialogTitle: t('lostItem.claimDialogTitle'),
    claimFieldLabel: t('lostItem.claimFieldLabel'),
    claimPlaceholder: t('lostItem.claimPlaceholder'),
    claimRequiredMessage: t('lostItem.claimRequiredMessage'),
    claimSubmitButton: t('lostItem.claimSubmitButton'),
    claimSuccessMessage: t('lostItem.claimSuccessMessage'),
    resolveDialogTitle: t('lostItem.resolveDialogTitle'),
    resolveQuestion: t('lostItem.resolveQuestion'),
    resolveSelfLabel: t('lostItem.resolveSelfLabel'),
    resolveUserLabel: t('lostItem.resolveUserLabel'),
    resolveOtherLabel: t('lostItem.resolveOtherLabel'),
    resolveSubmitButton: t('lostItem.resolveSubmitButton'),
    resolvedHeading: t('lostItem.resolvedHeading'),
    resolvedSelfText: t('lostItem.resolvedSelfText'),
    resolvedUserPrefix: t('lostItem.resolvedUserPrefix'),
    resolvedUserSuffix: t('lostItem.resolvedUserSuffix'),
    resolvedOtherText: t('lostItem.resolvedOtherText'),
    resolvedFallbackText: t('lostItem.resolvedFallbackText'),
  };
  return <ItemDetail config={lostDetailConfig} />;
}
