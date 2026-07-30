import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, Paper, Chip, Button, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Divider, Snackbar, Radio, RadioGroup, FormControlLabel, ListItemButton, ListItemText
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { getFoundItem, deleteFoundItem } from '../api/foundItems';
import type { FoundItemVO } from '../api/foundItems';
import { startConversation } from '../api/chat';
import client from '../api/client';
import { assetUrl } from '../config';
import ItemImageUpload from '../components/ItemImageUpload';

export default function FoundItemDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [item, setItem] = useState<FoundItemVO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Claim dialog
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimImages, setClaimImages] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  // Mark found dialog
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveType, setResolveType] = useState<'SELF' | 'USER' | 'OTHER'>('SELF');
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: number; realName: string } | null>(null);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchItem = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getFoundItem(Number(id));
      setItem(data);
    } catch {
      setError('加载招领信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItem();
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteFoundItem(Number(id));
      navigate('/found-items');
    } catch (err: any) {
      setError(err.response?.data?.message || '删除失败');
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleMarkClaimed = () => {
    setResolveType('SELF');
    setSelectedUser(null);
    setResolveNote('');
    setUserSearch('');
    setResolveOpen(true);
  };

  const handleUserSearch = async (q: string) => {
    setUserSearch(q);
    if (q.length < 1) { setUserResults([]); return; }
    try {
      const res = await client.get('/users/search', { params: { q } });
      setUserResults(res.data.data || []);
    } catch { setUserResults([]); }
  };

  const handleResolve = async () => {
    if (resolveType === 'USER' && !selectedUser) return;
    setResolving(true);
    try {
      await client.put(`/found-items/${id}/status`, {
        status: 'CLAIMED',
        resolvedType: resolveType,
        resolvedBy: resolveType === 'USER' ? selectedUser?.id : null,
        resolvedNote: resolveNote || undefined,
      });
      setResolveOpen(false);
      fetchItem();
    } catch (err: any) {
      setError(err.response?.data?.message || '操作失败');
    } finally {
      setResolving(false);
    }
  };

  const handleStartChat = async (targetUserId: number) => {
    try {
      const data = await startConversation(targetUserId);
      const name = encodeURIComponent(item?.userName || '');
      navigate(`/chat?conv=${data.conversationId}&to=${targetUserId}&name=${name}`);
    } catch { /* ignore */ }
  };

  const handleClaim = async () => {
    if (!claimMessage.trim()) {
      setClaimError('请填写认领说明');
      return;
    }
    setClaimSubmitting(true);
    setClaimError('');
    try {
      await client.post('/claims', {
        itemType: 'FOUND',
        itemId: Number(id),
        message: claimMessage,
        imageUrls: claimImages.join(','),
      });
      setClaimOpen(false);
      setClaimMessage('');
      setClaimImages([]);
      setClaimSuccess(true);
    } catch (err: any) {
      setClaimError(err.response?.data?.message || '提交失败');
    } finally {
      setClaimSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!item) {
    return <Alert severity="warning">招领信息不存在</Alert>;
  }

  const isOwner = user && user.id === item.userId;

  return (
    <Box>
      <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        返回
      </Button>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h4">{item.title}</Typography>
          <Chip
            label={item.status === 'UNCLAIMED' ? '待认领' : '已认领'}
            color={item.status === 'UNCLAIMED' ? 'warning' : 'success'}
            size="medium"
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip label={item.categoryName} variant="outlined" />
          <Chip label={item.location} variant="outlined" />
        </Box>

        <Typography variant="body1" color="text.secondary" gutterBottom>
          发现地点：{item.location}
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          发现时间：{new Date(item.foundTime).toLocaleString('zh-CN')}{item.foundTimeEnd && ` ~ ${new Date(item.foundTimeEnd).toLocaleString('zh-CN')}`}
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          发布者：<Link to={`/users/${item.userId}`} style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}>{item.userName}</Link>
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          发布时间：{new Date(item.createdAt).toLocaleString('zh-CN')}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* Cover image */}
        {item.coverImage && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>封面图片</Typography>
            <Box component="img" src={assetUrl(item.coverImage)}
              sx={{ width: '100%', maxHeight: 600, objectFit: 'contain', borderRadius: 1, bgcolor: 'grey.100' }} />
          </Box>
        )}

        <Typography variant="h6" gutterBottom>详细描述</Typography>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
          {item.description || '暂无描述'}
        </Typography>

        {item.status === 'CLAIMED' && (
          <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'success.light', borderRadius: 1, bgcolor: 'action.hover' }}>
            <Typography variant="subtitle1" color="success.main" gutterBottom>
              归还情况
            </Typography>
            <Typography variant="body2">
              {item.resolvedType === 'SELF' && '失主本人已认领'}
              {item.resolvedType === 'USER' && (<>已归还给站内用户 <Link to={`/users/${item.resolvedBy}`} style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}>{item.resolvedByName || '未知用户'}</Link></>)}
              {item.resolvedType === 'OTHER' && '已通过其他渠道归还'}
              {!item.resolvedType && '已确认归还'}
            </Typography>
            {item.resolvedNote && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                补充说明：{item.resolvedNote}
              </Typography>
            )}
          </Box>
        )}

        {/* Image gallery */}
        {item.imageUrls && item.imageUrls.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>物品图片</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {item.imageUrls.map((url, i) => (
                <Box
                  key={i}
                  component="img"
                  src={assetUrl(url)}
                  alt={`image-${i}`}
                  sx={{
                    width: 200,
                    height: 200,
                    objectFit: 'cover',
                    borderRadius: 1,
                    cursor: 'pointer',
                  }}
                  onClick={() => setPreview(assetUrl(url))}
                />
              ))}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Action buttons */}
        {user && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {isOwner ? (
              <>
                {item.status === 'UNCLAIMED' && (
                  <Button variant="contained" color="success" onClick={handleMarkClaimed}>
                    标记已归还
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/found-items/${item.id}/edit`, { state: { item } })}
                >
                  编辑
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteOpen(true)}
                >
                  删除
                </Button>
              </>
            ) : (
              item.status === 'UNCLAIMED' && (
                <>
                  <Button variant="contained" onClick={() => setClaimOpen(true)}>
                    我要认领
                  </Button>
                  <Button variant="outlined" onClick={() => handleStartChat(item.userId)}>
                    给拾主发消息
                  </Button>
                </>
              )
            )}
          </Box>
        )}
      </Paper>

      {/* Claim dialog */}
      <Dialog open={claimOpen} onClose={() => setClaimOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>认领物品</DialogTitle>
        <DialogContent>
          {claimError && <Alert severity="error" sx={{ mb: 2 }}>{claimError}</Alert>}
          <Typography variant="body2" color="text.secondary" gutterBottom>
            物品：{item?.title}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            label="认领说明"
            placeholder="请描述物品特征以便确认身份..."
            value={claimMessage}
            onChange={e => setClaimMessage(e.target.value)}
            sx={{ mt: 1 }}
          />
          <ItemImageUpload images={claimImages} onChange={setClaimImages} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setClaimOpen(false); setClaimImages([]); }}>取消</Button>
          <Button
            variant="contained"
            onClick={handleClaim}
            disabled={claimSubmitting}
          >
            {claimSubmitting ? '提交中...' : '提交认领'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>确定要删除此招领信息吗？此操作不可撤销。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>取消</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? '删除中...' : '确认删除'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resolve dialog */}
      <Dialog open={resolveOpen} onClose={() => setResolveOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>标记已归还</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            物品「{item?.title}」归还给了谁？
          </Typography>
          <RadioGroup value={resolveType} onChange={e => setResolveType(e.target.value as any)}>
            <FormControlLabel value="SELF" control={<Radio />} label="失主本人已认领" />
            <FormControlLabel value="USER" control={<Radio />} label="站内用户认领" />
            <FormControlLabel value="OTHER" control={<Radio />} label="其他人私下归还" />
          </RadioGroup>
          {resolveType === 'USER' && (
            <Box sx={{ mt: 1 }}>
              {selectedUser ? (
                <Chip label={selectedUser.realName} onDelete={() => setSelectedUser(null)} color="primary" />
              ) : (
                <>
                  <TextField fullWidth size="small" placeholder="搜索用户名或真实姓名..."
                    value={userSearch} onChange={e => handleUserSearch(e.target.value)} />
                  {userResults.length > 0 && (
                    <Paper variant="outlined" sx={{ maxHeight: 150, overflow: 'auto', mt: 0.5 }}>
                      {userResults.map((u: any) => (
                        <ListItemButton key={u.id} onClick={() => { setSelectedUser(u); setUserSearch(''); setUserResults([]); }}>
                          <ListItemText primary={u.realName} secondary={`@${u.username}`} />
                        </ListItemButton>
                      ))}
                    </Paper>
                  )}
                </>
              )}
            </Box>
          )}
          <TextField fullWidth multiline rows={2} label="补充说明（可选）"
            value={resolveNote} onChange={e => setResolveNote(e.target.value)} sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveOpen(false)}>取消</Button>
          <Button variant="contained" color="success"
            onClick={handleResolve} disabled={resolving || (resolveType === 'USER' && !selectedUser)}>
            {resolving ? '提交中...' : '标记已归还'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image preview dialog */}
      <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="lg"
        slotProps={{ paper: { sx: { bgcolor: 'transparent', boxShadow: 'none', maxWidth: '90vw', maxHeight: '90vh' } }}}>
        {preview && (
          <Box component="img" src={preview}
            sx={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 1 }} />
        )}
      </Dialog>
      <Snackbar open={claimSuccess} autoHideDuration={3000} onClose={() => setClaimSuccess(false)}
        message="认领申请已提交！" />
    </Box>
  );
}
