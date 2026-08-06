import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControlLabel, ListItemButton,
  ListItemText, Paper, Radio, RadioGroup, Snackbar, TextField, Typography,
} from '@mui/material';
import { ArrowBack as BackIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { startConversation } from '../api/chat';
import client from '../api/client';
import { assetUrl } from '../config';
import ItemImageUpload from './ItemImageUpload';
import { getApiErrorMessage } from '../api/errors';

interface UserSearchResult {
  id: number;
  realName: string;
  username: string;
}

export interface ItemDetailItem {
  id: number;
  title: string;
  categoryName: string;
  location: string;
  coverImage?: string;
  status: string;
  userId: number;
  userName: string;
  createdAt: string;
  description?: string;
  imageUrls?: string[];
  resolvedType?: string;
  resolvedBy?: number;
  resolvedByName?: string;
  resolvedNote?: string;
}

export interface ItemDetailConfig<TItem extends ItemDetailItem> {
  type: 'lost' | 'found';
  itemType: 'LOST' | 'FOUND';
  infoName: string;
  listPath: string;
  editPath: string;
  fetchItem: (id: number) => Promise<TItem>;
  deleteItem: (id: number) => Promise<unknown>;
  getTimeStart: (item: TItem) => string;
  getTimeEnd: (item: TItem) => string | undefined;
  locationLabel: string;
  timeLabel: string;
  activeStatus: string;
  resolvedStatus: string;
  activeStatusLabel: string;
  resolvedStatusLabel: string;
  activeStatusColor: 'error' | 'warning';
  ownerResolveButton: string;
  chatButton: string;
  claimButton: string;
  claimDialogTitle: string;
  claimFieldLabel: string;
  claimPlaceholder: string;
  claimRequiredMessage: string;
  claimSubmitButton: string;
  claimSuccessMessage: string;
  resolveDialogTitle: string;
  resolveQuestion: string;
  resolveSelfLabel: string;
  resolveUserLabel: string;
  resolveOtherLabel: string;
  resolveSubmitButton: string;
  resolvedHeading: string;
  resolvedSelfText: string;
  resolvedUserPrefix: string;
  resolvedUserSuffix: string;
  resolvedOtherText: string;
  resolvedFallbackText: string;
}

export default function ItemDetail<TItem extends ItemDetailItem>({ config }: { config: ItemDetailConfig<TItem> }) {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [item, setItem] = useState<TItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimImages, setClaimImages] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveType, setResolveType] = useState<'SELF' | 'USER' | 'OTHER'>('SELF');
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const userSearchRequestRef = useRef(0);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItem(await config.fetchItem(Number(id)));
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, `加载${config.infoName}失败`));
    } finally {
      setLoading(false);
    }
  }, [config, id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await config.deleteItem(Number(id));
      navigate(config.listPath);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, '删除失败'));
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleStartChat = async (targetUserId: number) => {
    try {
      const data = await startConversation(targetUserId);
      const name = encodeURIComponent(item?.userName || '');
      navigate(`/chat?conv=${data.conversationId}&to=${targetUserId}&name=${name}`);
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, '发起对话失败'));
    }
  };

  const openResolveDialog = () => {
    setResolveType('SELF');
    setSelectedUser(null);
    setResolveNote('');
    setUserSearch('');
    setResolveOpen(true);
  };

  useEffect(() => {
    const query = userSearch.trim();
    const requestId = ++userSearchRequestRef.current;
    if (!query) {
      setUserResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const response = await client.get('/users/search', { params: { q: query } });
        if (requestId === userSearchRequestRef.current) setUserResults(response.data.data || []);
      } catch (errorValue) {
        if (requestId === userSearchRequestRef.current) {
          setUserResults([]);
          setError(getApiErrorMessage(errorValue, '搜索用户失败，请重试'));
        }
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [userSearch]);

  const handleResolve = async () => {
    if (resolveType === 'USER' && !selectedUser) return;
    setResolving(true);
    try {
      await client.put(`/${config.type}-items/${id}/status`, {
        status: config.resolvedStatus,
        resolvedType: resolveType,
        resolvedBy: resolveType === 'USER' ? selectedUser?.id : null,
        resolvedNote: resolveNote || undefined,
      });
      setResolveOpen(false);
      await fetchItem();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, '操作失败'));
    } finally {
      setResolving(false);
    }
  };

  const handleClaim = async () => {
    if (!claimMessage.trim()) {
      setClaimError(config.claimRequiredMessage);
      return;
    }
    setClaimSubmitting(true);
    setClaimError('');
    try {
      await client.post('/claims', {
        itemType: config.itemType,
        itemId: Number(id),
        message: claimMessage,
        imageUrls: claimImages.join(','),
      });
      setClaimOpen(false);
      setClaimMessage('');
      setClaimImages([]);
      setClaimSuccess(true);
    } catch (err: unknown) {
      setClaimError(getApiErrorMessage(err, '提交失败'));
    } finally {
      setClaimSubmitting(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!item) return <Alert severity="warning">{config.infoName}不存在</Alert>;

  const isOwner = user && user.id === item.userId;
  const isActive = item.status === config.activeStatus;

  return (
    <Box>
      <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>返回</Button>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h4">{item.title}</Typography>
          <Chip label={isActive ? config.activeStatusLabel : config.resolvedStatusLabel}
            color={isActive ? config.activeStatusColor : 'success'} size="medium" />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip label={item.categoryName} variant="outlined" />
          <Chip label={item.location} variant="outlined" />
        </Box>
        <Typography variant="body1" color="text.secondary" gutterBottom>{config.locationLabel}：{item.location}</Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          {config.timeLabel}：{new Date(config.getTimeStart(item)).toLocaleString('zh-CN')}
          {config.getTimeEnd(item) && ` ~ ${new Date(config.getTimeEnd(item) as string).toLocaleString('zh-CN')}`}
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          发布者：<Link to={`/users/${item.userId}`} style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}>{item.userName}</Link>
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>发布时间：{new Date(item.createdAt).toLocaleString('zh-CN')}</Typography>
        <Divider sx={{ my: 2 }} />

        {item.coverImage && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>封面图片</Typography>
            <Box component="img" src={assetUrl(item.coverImage)} sx={{ width: '100%', maxHeight: 600, objectFit: 'contain', borderRadius: 1, bgcolor: 'grey.100' }} />
          </Box>
        )}
        <Typography variant="h6" gutterBottom>详细描述</Typography>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>{item.description || '暂无描述'}</Typography>

        {item.status === config.resolvedStatus && (
          <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'success.light', borderRadius: 1, bgcolor: 'action.hover' }}>
            <Typography variant="subtitle1" color="success.main" gutterBottom>{config.resolvedHeading}</Typography>
            <Typography variant="body2">
              {item.resolvedType === 'SELF' && config.resolvedSelfText}
              {item.resolvedType === 'USER' && <>{config.resolvedUserPrefix} <Link to={`/users/${item.resolvedBy}`} style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}>{item.resolvedByName || '未知用户'}</Link>{config.resolvedUserSuffix}</>}
              {item.resolvedType === 'OTHER' && config.resolvedOtherText}
              {!item.resolvedType && config.resolvedFallbackText}
            </Typography>
            {item.resolvedNote && <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>补充说明：{item.resolvedNote}</Typography>}
          </Box>
        )}

        {item.imageUrls && item.imageUrls.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>物品图片</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {item.imageUrls.map((url, index) => (
                <Box key={url} component="img" src={assetUrl(url)} alt={`image-${index}`}
                  sx={{ width: 200, height: 200, objectFit: 'cover', borderRadius: 1, cursor: 'pointer' }}
                  onClick={() => setPreview(assetUrl(url))} />
              ))}
            </Box>
          </Box>
        )}
        <Divider sx={{ my: 2 }} />

        {user && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {isOwner ? <>
              {isActive && <Button variant="contained" color="success" onClick={openResolveDialog}>{config.ownerResolveButton}</Button>}
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`${config.editPath}/${item.id}/edit`, { state: { item } })}>编辑</Button>
              <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteOpen(true)}>删除</Button>
            </> : isActive && <>
              <Button variant="contained" onClick={() => setClaimOpen(true)}>{config.claimButton}</Button>
              <Button variant="outlined" onClick={() => handleStartChat(item.userId)}>{config.chatButton}</Button>
            </>}
          </Box>
        )}
      </Paper>

      <Dialog open={claimOpen} onClose={() => setClaimOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{config.claimDialogTitle}</DialogTitle>
        <DialogContent>
          {claimError && <Alert severity="error" sx={{ mb: 2 }}>{claimError}</Alert>}
          <Typography variant="body2" color="text.secondary" gutterBottom>物品：{item.title}</Typography>
          <TextField autoFocus fullWidth multiline rows={4} label={config.claimFieldLabel} placeholder={config.claimPlaceholder}
            value={claimMessage} onChange={event => setClaimMessage(event.target.value)} sx={{ mt: 1 }} />
          <ItemImageUpload images={claimImages} onChange={setClaimImages} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setClaimOpen(false); setClaimImages([]); }}>取消</Button>
          <Button variant="contained" onClick={handleClaim} disabled={claimSubmitting}>{claimSubmitting ? '提交中...' : config.claimSubmitButton}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent><Typography>确定要删除此{config.infoName}吗？此操作不可撤销。</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>取消</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>{deleting ? '删除中...' : '确认删除'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resolveOpen} onClose={() => setResolveOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{config.resolveDialogTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>物品「{item.title}」{config.resolveQuestion}</Typography>
          <RadioGroup value={resolveType} onChange={event => setResolveType(event.target.value as 'SELF' | 'USER' | 'OTHER')}>
            <FormControlLabel value="SELF" control={<Radio />} label={config.resolveSelfLabel} />
            <FormControlLabel value="USER" control={<Radio />} label={config.resolveUserLabel} />
            <FormControlLabel value="OTHER" control={<Radio />} label={config.resolveOtherLabel} />
          </RadioGroup>
          {resolveType === 'USER' && (
            <Box sx={{ mt: 1 }}>
              {selectedUser ? <Chip label={selectedUser.realName} onDelete={() => setSelectedUser(null)} color="primary" /> : <>
                <TextField fullWidth size="small" placeholder="搜索用户名或真实姓名..." value={userSearch} onChange={event => setUserSearch(event.target.value)} />
                {userResults.length > 0 && (
                  <Paper variant="outlined" sx={{ maxHeight: 150, overflow: 'auto', mt: 0.5 }}>
                    {userResults.map(result => (
                      <ListItemButton key={result.id} onClick={() => { setSelectedUser(result); setUserSearch(''); setUserResults([]); }}>
                        <ListItemText primary={result.realName} secondary={`@${result.username}`} />
                      </ListItemButton>
                    ))}
                  </Paper>
                )}
              </>}
            </Box>
          )}
          <TextField fullWidth multiline rows={2} label="补充说明（可选）" value={resolveNote} onChange={event => setResolveNote(event.target.value)} sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveOpen(false)}>取消</Button>
          <Button variant="contained" color="success" onClick={handleResolve} disabled={resolving || (resolveType === 'USER' && !selectedUser)}>
            {resolving ? '提交中...' : config.resolveSubmitButton}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} maxWidth="lg"
        slotProps={{ paper: { sx: { bgcolor: 'transparent', boxShadow: 'none', maxWidth: '90vw', maxHeight: '90vh' } } }}>
        {preview && <Box component="img" src={preview} sx={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 1 }} />}
      </Dialog>
      <Snackbar open={claimSuccess} autoHideDuration={3000} onClose={() => setClaimSuccess(false)} message={config.claimSuccessMessage} />
    </Box>
  );
}
