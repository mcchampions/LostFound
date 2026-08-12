import ItemDetail from '../components/ItemDetail';
import type { ItemDetailConfig } from '../components/ItemDetail';
import { deleteFoundItem, getFoundItem } from '../api/foundItems';
import type { FoundItemVO } from '../api/foundItems';
import { useTranslation } from 'react-i18next';

export default function FoundItemDetail() {
  const { t } = useTranslation();
  const foundDetailConfig: ItemDetailConfig<FoundItemVO> = {
    type: 'found',
    itemType: 'FOUND',
    infoName: t('foundItem.infoName'),
    listPath: '/found-items',
    editPath: '/found-items',
    fetchItem: getFoundItem,
    deleteItem: deleteFoundItem,
    getTimeStart: item => item.foundTime,
    getTimeEnd: item => item.foundTimeEnd,
    locationLabel: t('foundItem.locationLabel'),
    timeLabel: t('foundItem.timeLabel'),
    activeStatus: 'UNCLAIMED',
    resolvedStatus: 'CLAIMED',
    activeStatusLabel: t('foundItem.activeStatusLabel'),
    resolvedStatusLabel: t('foundItem.resolvedStatusLabel'),
    activeStatusColor: 'warning',
    ownerResolveButton: t('foundItem.ownerResolveButton'),
    chatButton: t('foundItem.chatButton'),
    claimButton: t('foundItem.claimButton'),
    claimDialogTitle: t('foundItem.claimDialogTitle'),
    claimFieldLabel: t('foundItem.claimFieldLabel'),
    claimPlaceholder: t('foundItem.claimPlaceholder'),
    claimRequiredMessage: t('foundItem.claimRequiredMessage'),
    claimSubmitButton: t('foundItem.claimSubmitButton'),
    claimSuccessMessage: t('foundItem.claimSuccessMessage'),
    resolveDialogTitle: t('foundItem.resolveDialogTitle'),
    resolveQuestion: t('foundItem.resolveQuestion'),
    resolveSelfLabel: t('foundItem.resolveSelfLabel'),
    resolveUserLabel: t('foundItem.resolveUserLabel'),
    resolveOtherLabel: t('foundItem.resolveOtherLabel'),
    resolveSubmitButton: t('foundItem.resolveSubmitButton'),
    resolvedHeading: t('foundItem.resolvedHeading'),
    resolvedSelfText: t('foundItem.resolvedSelfText'),
    resolvedUserPrefix: t('foundItem.resolvedUserPrefix'),
    resolvedUserSuffix: t('foundItem.resolvedUserSuffix'),
    resolvedOtherText: t('foundItem.resolvedOtherText'),
    resolvedFallbackText: t('foundItem.resolvedFallbackText'),
  };
  return <ItemDetail config={foundDetailConfig} />;
}
