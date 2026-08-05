import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, IconButton,
  Pagination, CircularProgress, Alert, Tooltip
} from '@mui/material';
import {
  Check as CheckIcon, Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { getReceivedClaims, getSentClaims, processClaim } from '../api/claims';
import type { ClaimVO } from '../api/claims';
import { getApiErrorMessage } from '../api/errors';

const statusLabels: Record<string, string> = {
  PENDING: '待处理',
  APPROVED: '已批准',
  REJECTED: '已拒绝',
};

const statusColors: Record<string, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

export default function Claims() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);

  const [received, setReceived] = useState<ClaimVO[]>([]);
  const [receivedTotal, setReceivedTotal] = useState(0);
  const [receivedPage, setReceivedPage] = useState(1);
  const [receivedPages, setReceivedPages] = useState(1);

  const [sent, setSent] = useState<ClaimVO[]>([]);
  const [sentTotal, setSentTotal] = useState(0);
  const [sentPage, setSentPage] = useState(1);
  const [sentPages, setSentPages] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const pageSize = 10;

  const fetchReceived = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await getReceivedClaims({ page: receivedPage, size: pageSize });
      setReceived(data.records || []);
      setReceivedTotal(data.total || 0);
      setReceivedPages(Math.ceil((data.total || 0) / pageSize) || 1);
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, '加载收到的申请失败'));
    } finally {
      setLoading(false);
    }
  }, [receivedPage, user]);

  const fetchSent = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await getSentClaims({ page: sentPage, size: pageSize });
      setSent(data.records || []);
      setSentTotal(data.total || 0);
      setSentPages(Math.ceil((data.total || 0) / pageSize) || 1);
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, '加载发出的申请失败'));
    } finally {
      setLoading(false);
    }
  }, [sentPage, user]);

  useEffect(() => {
    if (tab === 0) {
      fetchReceived();
    } else {
      fetchSent();
    }
  }, [tab, fetchReceived, fetchSent]);

  const handleProcess = async (id: number, status: string) => {
    setActionLoading(id);
    try {
      await processClaim(id, status);
      setReceived(prev =>
        prev.map(c => (c.id === id ? { ...c, status } : c))
      );
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, '操作失败'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, value: number) => {
    setTab(value);
  };

  if (!user) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="text.secondary">请先登录</Typography>
      </Box>
    );
  }

  const renderTable = (claims: ClaimVO[], isReceived: boolean) => {
    if (claims.length === 0 && !loading) {
      return (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary">暂无申请记录</Typography>
        </Box>
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>物品标题</TableCell>
              <TableCell>{isReceived ? '申请人' : '发布者'}</TableCell>
              <TableCell>附言</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>时间</TableCell>
              {isReceived && <TableCell>操作</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {claims.map(claim => (
              <TableRow key={claim.id}>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      cursor: 'pointer',
                      color: 'primary.main',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                    component="span"
                    onClick={() => {
                      const path = claim.itemType === 'LOST'
                        ? `/lost-items/${claim.itemId}`
                        : `/found-items/${claim.itemId}`;
                      window.open(path, '_blank');
                    }}
                  >
                    {claim.itemTitle}
                  </Typography>
                </TableCell>
                <TableCell>{isReceived ? claim.applicantName : claim.publisherName}</TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                    {claim.message || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={statusLabels[claim.status] || claim.status}
                    size="small"
                    color={statusColors[claim.status] || 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(claim.createdAt).toLocaleString('zh-CN')}
                  </Typography>
                </TableCell>
                {isReceived && (
                  <TableCell>
                    {claim.status === 'PENDING' && (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="批准">
                          <IconButton
                            color="success"
                            size="small"
                            disabled={actionLoading === claim.id}
                            onClick={() => handleProcess(claim.id, 'APPROVED')}
                          >
                            <CheckIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="拒绝">
                          <IconButton
                            color="error"
                            size="small"
                            disabled={actionLoading === claim.id}
                            onClick={() => handleProcess(claim.id, 'REJECTED')}
                          >
                            <CloseIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ pb: 1, mb: 3, borderBottom: 2, borderColor: 'primary.main', display: 'inline-block' }}>认领申请</Typography>

      <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label={`收到的申请 (${receivedTotal})`} />
        <Tab label={`发出的申请 (${sentTotal})`} />
      </Tabs>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {tab === 0 ? (
            <>
              {renderTable(received, true)}
              {receivedPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={receivedPages}
                    page={receivedPage}
                    onChange={(_, v) => setReceivedPage(v)}
                    color="primary"
                  />
                </Box>
              )}
              {receivedTotal > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                  共 {receivedTotal} 条记录
                </Typography>
              )}
            </>
          ) : (
            <>
              {renderTable(sent, false)}
              {sentPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={sentPages}
                    page={sentPage}
                    onChange={(_, v) => setSentPage(v)}
                    color="primary"
                  />
                </Box>
              )}
              {sentTotal > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                  共 {sentTotal} 条记录
                </Typography>
              )}
            </>
          )}
        </>
      )}
    </Box>
  );
}
