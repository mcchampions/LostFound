import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, Paper, Chip, Button, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Divider, Snackbar, Radio, RadioGroup, FormControlLabel, ListItemButton, ListItemText
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { getLostItem, deleteLostItem } from '../api/lostItems';
import type { LostItemVO } from '../api/lostItems';
import { startConversation } from '../api/chat';
import client from '../api/client';
import { assetUrl } from '../config';
import ItemImageUpload from '../components/ItemImageUpload';

export default function LostItemDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [item, setItem] = useState<LostItemVO | null>(null);
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

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Mark found dialog
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveType, setResolveType] = useState<'SELF' | 'USER' | 'OTHER'>('SELF');
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: number; realName: string } | null>(null);

  const fetchItem = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getLostItem(Number(id));
      setItem(data);
    } catch {
      setError('加载失物信息失败');
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
      await deleteLostItem(Number(id));
      navigate('/lost-items');
    } catch (err: any) {
      setError(err.response?.data?.message || '删除失败');
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
    } catch { /* ignore */ }
  };

  const handleMarkFound = () => {
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
      await client.put(`/lost-items/${id}/status`, {
        status: 'FOUND',
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

  const handleClaim = async () => {
    if (!claimMessage.trim()) {
      setClaimError('请描述您在哪里找到的');
      return;
    }
    setClaimSubmitting(true);
    setClaimError('');
    try {
      await client.post('/claims', {
        itemType: 'LOST',
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
    return <Alert severity="warning">失物信息不存在</Alert>;
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
            label={item.status === 'LOST' ? '未找到' : '已找到'}
            color={item.status === 'LOST' ? 'error' : 'success'}
            size="medium"
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip label={item.categoryName} variant="outlined" />
          <Chip label={item.location} variant="outlined" />
        </Box>

        <Typography variant="body1" color="text.secondary" gutterBottom>
          丢失地点：{item.location}
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          丢失时间：{new Date(item.lostTime).toLocaleString('zh-CN')}{item.lostTimeEnd && ` ~ ${new Date(item.lostTimeEnd).toLocaleString('zh-CN')}`}
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

        {item.status === 'FOUND' && (
          <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'success.light', borderRadius: 1, bgcolor: 'action.hover' }}>
            <Typography variant="subtitle1" color="success.main" gutterBottom>
              解决情况
            </Typography>
            <Typography variant="body2">
              {item.resolvedType === 'SELF' && '发布者自行找回'}
              {item.resolvedType === 'USER' && (<>由站内用户 <Link to={`/users/${item.resolvedBy}`} style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}>{item.resolvedByName || '未知用户'}</Link> 找到</>)}
              {item.resolvedType === 'OTHER' && '通过其他渠道找回'}
              {!item.resolvedType && '已确认找回'}
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
                {item.status === 'LOST' && (
                  <Button variant="contained" color="success" onClick={handleMarkFound}>
                    标记已找到
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/lost-items/${item.id}/edit`, { state: { item } })}
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
              item.status === 'LOST' && (
                <>
                  <Button variant="contained" onClick={() => setClaimOpen(true)}>
                    我找到了
                  </Button>
                  <Button variant="outlined" onClick={() => handleStartChat(item.userId)}>
                    给失主发消息
                  </Button>
                </>
              )
            )}
          </Box>
        )}
      </Paper>

      {/* Claim dialog */}
      <Dialog open={claimOpen} onClose={() => setClaimOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>我找到了这个物品</DialogTitle>
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
            label="找到说明"
            placeholder="请描述您在哪里找到的..."
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
            {claimSubmitting ? '提交中...' : '提交'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>确定要删除此失物信息吗？此操作不可撤销。</Typography>
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
        <DialogTitle>标记已找到</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            物品「{item?.title}」是谁找到的？
          </Typography>
          <RadioGroup value={resolveType} onChange={e => setResolveType(e.target.value as any)}>
            <FormControlLabel value="SELF" control={<Radio />} label="我自己找到的" />
            <FormControlLabel value="USER" control={<Radio />} label="站内用户找到" />
            <FormControlLabel value="OTHER" control={<Radio />} label="其他人私下解决" />
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
          <TextField
            fullWidth multiline rows={2} label="补充说明（可选）"
            value={resolveNote} onChange={e => setResolveNote(e.target.value)} sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveOpen(false)}>取消</Button>
          <Button variant="contained" color="success"
            onClick={handleResolve} disabled={resolving || (resolveType === 'USER' && !selectedUser)}>
            {resolving ? '提交中...' : '标记已找到'}
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
        message="提交成功，物主将会收到通知！" />
    </Box>
  );
}
